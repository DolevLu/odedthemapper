"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hasAccessToDestination } from "@/lib/access";
import { requireSessionUserId } from "@/lib/groupAccess";
import { consumeApiQuota } from "@/lib/apiQuota";
import { geminiGenerate } from "@/lib/gemini";
import { SAVED_PIN_CATEGORY_OPTIONS } from "@/lib/mapStyles";
import { canonicalSocialUrl, extractSocialUrl, heuristicHints, platformForUrl, readSocialPost, type SocialPlatform } from "@/lib/socialLink";
import { saveResolvedPins } from "@/lib/actions/mapImport";
import { mirrorRemoteImage } from "@/lib/uploads";
import type { ResolvedPin } from "@/lib/googlePlaceDetails";

export type SharedSource = {
  platform: SocialPlatform;
  url: string;
  title: string | null;
  caption: string | null;
  author: string | null;
  thumbnail: string | null;
};

export type PlaceGuess = {
  /** Text to search on Google ("name, city") */
  query: string;
  name: string;
  city: string | null;
  category: string | null;
  confidence: number;
};

export type AnalyzeResult =
  | { ok: true; source: SharedSource; guesses: PlaceGuess[]; via: "ai" | "caption" | "none" }
  | { ok: false; error: string };

const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Step 1 of "share a reel into Travi": reads the shared link's public preview (caption, author, thumbnail) and
 * works out which real place the post is about. Names only - the browser then verifies every guess against Google
 * Places, so a wrong guess can never put a non-existent place on the map. */
export async function analyzeSharedLink(rawText: string): Promise<AnalyzeResult> {
  const userId = await requireSessionUserId();
  const url = extractSocialUrl(String(rawText ?? "").slice(0, 4000));
  if (!url) return { ok: false, error: "no-link" };
  if (!(await consumeApiQuota(userId, "socialImport"))) return { ok: false, error: "quota" };

  const post = await readSocialPost(url);
  const sharedWithLink = String(rawText).replace(url, " ").trim().slice(0, 800); // some apps put the caption in the share text
  const base: SharedSource = {
    platform: platformForUrl(url)!,
    url: post?.canonicalUrl ?? canonicalSocialUrl(url),
    title: post?.title ?? null,
    caption: post?.caption ?? (sharedWithLink || null),
    author: post?.author ?? null,
    thumbnail: post?.thumbnail ?? null,
  };
  const context = [base.caption, sharedWithLink && sharedWithLink !== base.caption ? sharedWithLink : null].filter(Boolean).join("\n");
  const hints = heuristicHints(context);

  // The caption's own 📍 line is the strongest, free signal.
  const fromPin: PlaceGuess[] = hints.pinLines.map((l) => ({ query: l.slice(0, 120), name: l.slice(0, 120), city: null, category: null, confidence: 0.7 }));

  if (!context.trim() && !base.title) return { ok: true, source: base, guesses: [], via: "none" };

  // AI reading of caption + hashtags (counts against the daily AI-planning budget; falls back to the caption hints).
  if (process.env.GEMINI_API_KEY && (await consumeApiQuota(userId, "aiPlanning"))) {
    const system = `You read the caption of a social-media travel video and identify the ONE real, specific place it is about (a cafe, restaurant, bar, park, viewpoint, museum, attraction, shop, hotel, trail...). Return JSON only: {"places":[{"name": the place name as it appears on Google Maps, "city": the city, "category": one of ${SAVED_PIN_CATEGORY_OPTIONS.join(" / ")}, "confidence": 0 to 1}]} with at most 3 places, best first. Use the 📍 line, @mentions of businesses and hashtags as clues (a city hashtag tells you the city). If the post is not about a specific place, return {"places":[]}. Never invent a place that the text does not point to.`;
    try {
      const res = await geminiGenerate(
        {
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: `Platform: ${base.platform}\nAuthor: ${base.author ?? ""}\nTitle: ${base.title ?? ""}\nCaption:\n${context.slice(0, 1500)}\nPin lines: ${hints.pinLines.join(" | ")}\nHashtags: ${hints.hashtags.join(" ")}\nMentions: ${hints.mentions.join(" ")}` }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.1, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
        },
        15000
      );
      if (res?.ok) {
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
        const parsed = raw ? JSON.parse(raw) : null;
        const places: Record<string, unknown>[] = Array.isArray(parsed?.places) ? parsed.places : [];
        const guesses = places.slice(0, 3).flatMap((p) => {
          const name = text(p.name, 120);
          if (!name) return [];
          const city = text(p.city, 80);
          const category = typeof p.category === "string" && SAVED_PIN_CATEGORY_OPTIONS.includes(p.category) ? p.category : null;
          const conf = typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : 0.5;
          return [{ query: [name, city].filter(Boolean).join(", "), name, city, category, confidence: conf }];
        });
        if (guesses.length > 0) return { ok: true, source: base, guesses, via: "ai" };
      }
    } catch {
      /* fall through to caption hints */
    }
  }
  return { ok: true, source: base, guesses: fromPin, via: fromPin.length > 0 ? "caption" : "none" };
}

export type NearbyDestination = { id: string; slug: string; name: string; distanceKm: number };

/** Step 2: which of the destinations this user can open is the resolved place in? (Nearest curated point within
 * ~60 km, so a place just outside a city center still lands in the right destination.) */
export async function findDestinationForPoint(lat: number, lng: number): Promise<NearbyDestination | null> {
  const userId = await requireSessionUserId();
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const rows = await prisma.$queryRaw<{ id: string; slug: string; name: string; d2: number }[]>`
    SELECT d."id", d."slug", d."name",
           MIN((p."lat" - ${lat})^2 + ((p."lng" - ${lng}) * COS(RADIANS(${lat})))^2) AS d2
    FROM "PointOfInterest" p
    JOIN "Category" c ON c."id" = p."categoryId"
    JOIN "Area" a ON a."id" = c."areaId"
    JOIN "Destination" d ON d."id" = a."destinationId"
    WHERE p."lat" BETWEEN ${lat - 0.6} AND ${lat + 0.6}
      AND p."lng" BETWEEN ${lng - 0.8} AND ${lng + 0.8}
      AND d."status" <> 'draft'
    GROUP BY d."id", d."slug", d."name"
    ORDER BY d2 ASC
    LIMIT 4`;
  for (const r of rows) {
    const km = Math.sqrt(Number(r.d2)) * 111;
    if (km > 60) continue;
    if (await hasAccessToDestination(userId, r.id)) return { id: r.id, slug: r.slug, name: r.name, distanceKm: Math.round(km) };
  }
  return null;
}

const SOURCE_HOST = (u: string | null | undefined): string | null => {
  if (!u) return null;
  return platformForUrl(u) ? canonicalSocialUrl(u) : null;
};
const httpsOnly = (u: string | null | undefined): string | null => {
  try {
    return u && new URL(u).protocol === "https:" ? u.slice(0, 1000) : null;
  } catch {
    return null;
  }
};

/** Step 3: saves the verified place as a pin on the destination's map and attaches the original post to it
 * (link + thumbnail) as a reference. The pin is created exactly like any other imported place (same validation,
 * photo mirroring and duplicate handling) with source "social". */
export async function saveSocialPin(
  destinationId: string,
  slug: string,
  pin: ResolvedPin,
  src: { url: string; platform: SocialPlatform; thumbnail: string | null; title: string | null; caption: string | null }
): Promise<{ ok: true; pinId: string | null; already: boolean } | { ok: false; error: string }> {
  const userId = await requireSessionUserId();
  if (!(await hasAccessToDestination(userId, destinationId))) return { ok: false, error: "no-access" };
  const sourceUrl = SOURCE_HOST(src.url);
  if (!sourceUrl) return { ok: false, error: "bad-link" };

  const note = (src.caption ?? "").replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim().slice(0, 240) || null;
  const { saved, skipped } = await saveResolvedPins(destinationId, slug, [{ ...pin, note: pin.note ?? note }], "social");

  const existing = await prisma.savedMapPin.findFirst({
    where: { userId, destinationId, placeId: pin.placeId.slice(0, 200) },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "not-saved" };
  // Social-network thumbnails are signed, short-lived CDN links - keep our own copy so the preview doesn't break.
  const remoteThumb = httpsOnly(src.thumbnail);
  const thumb = remoteThumb ? await mirrorRemoteImage(remoteThumb, "social-thumbs") : null;
  await prisma.savedMapPin.update({
    where: { id: existing.id },
    data: { sourceUrl, sourcePlatform: src.platform, sourceThumb: thumb, sourceTitle: src.title ? src.title.slice(0, 200) : null },
  });
  revalidatePath(`/trip/${slug}`);
  return { ok: true, pinId: existing.id, already: saved === 0 && skipped > 0 };
}
