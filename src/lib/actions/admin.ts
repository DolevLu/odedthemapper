"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { importKmlFilesToDestination } from "@/lib/kml/importToDb";
import { findWikipediaPhoto, generateDescriptionAndWebsite } from "@/lib/kml/enrichPoi";
import { extractTextDescription } from "@/lib/data/pois";
import { canManageContent } from "@/lib/access";
import { getPhrasebookSeedForSlug } from "@/lib/phrasebookSeeds";
import { STARTER_THEMES } from "@/lib/theme/starterThemes";
import type { ThemeConfig } from "@/lib/theme/types";

async function requireContentManager() {
  const session = await auth();
  if (!session?.user?.id || !(await canManageContent(session.user.id))) {
    throw new Error("אין הרשאה לניהול תוכן");
  }
}

/** Turns a free-typed name/slug into a clean URL-safe slug: lowercase,
 * letters/numbers only, dash-separated. Works for Hebrew and other non-Latin
 * names too (\p{L}/\p{N} match any script), not just ASCII. */
function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Creates a new destination — the admin panel had no way to do this before
 * (every existing destination was seeded directly). Starts as "draft"
 * (invisible to customers, matching DestinationCard's isComingSoon check)
 * with a starter theme the admin picks from STARTER_THEMES; content (KML,
 * coupons, phrasebook) is added afterward from the destination's own admin
 * page. Returns the new slug instead of calling redirect() itself — this is
 * invoked imperatively from a client component (not as a bare <form
 * action={...}>), and redirect()'s special throw is only guaranteed to be
 * intercepted correctly for the latter; the client does the navigation once
 * it gets a successful result back. Every failure path (including an
 * unexpected thrown error, e.g. a permission check) resolves to a returned
 * {error} instead of throwing, so the caller always gets visible feedback
 * rather than a silent no-op. */
export async function createDestination(formData: FormData): Promise<{ ok: true; slug: string } | { error: string }> {
  try {
    await requireContentManager();

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "שם היעד הוא שדה חובה" };

    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugify(slugInput || name);
    if (!slug) return { error: "לא הצלחנו לייצר כתובת (slug) תקינה מהשם - נסו להזין אחת ידנית" };

    const existing = await prisma.destination.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return { error: `כבר קיים יעד עם הכתובת "${slug}"` };

    const tagline = String(formData.get("tagline") ?? "").trim() || null;
    const continent = String(formData.get("continent") ?? "europe");
    const isBestSeller = formData.get("isBestSeller") === "on";

    let theme: ThemeConfig;
    try {
      theme = JSON.parse(String(formData.get("themeConfig") ?? ""));
      if (!theme?.palette?.primary) throw new Error("invalid theme");
    } catch {
      theme = STARTER_THEMES[0].theme;
    }

    await prisma.destination.create({
      data: {
        slug,
        name,
        tagline,
        continent,
        isBestSeller,
        status: "draft",
        themeConfig: JSON.stringify(theme),
      },
    });

    revalidateTag("destinations-list", "max");
    revalidatePath("/admin/destinations");
    revalidatePath("/");
    return { ok: true, slug };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "שגיאה לא צפויה ביצירת היעד" };
  }
}

/** Deletes all imported content (areas/categories/POIs cascade) and the KML
 * import history for a destination, without touching the destination record
 * itself. Used both standalone and as the first step of a KML replace. */
export async function deleteDestinationContent(destinationId: string, slug: string) {
  await requireContentManager();
  await prisma.area.deleteMany({ where: { destinationId } });
  await prisma.kmlImport.deleteMany({ where: { destinationId } });
  revalidateTag(`pois-${destinationId}`, "max");
  revalidateTag("destinations-list", "max");
  revalidatePath(`/admin/destinations/${slug}`);
  revalidatePath(`/trip/${slug}`);
}

/** Uploads + imports one or more KML files, auto-seeds the destination's
 * phrasebook (if empty) from a curated per-language phrase list, and
 * publishes the destination — one action takes raw KML(s) all the way to a
 * fully working destination. Any previously imported content for this
 * destination is cleared first, so re-uploading always fully replaces the
 * old map rather than duplicating it; when multiple files are given (e.g.
 * one KML per city), their areas/categories are merged into one coherent
 * map instead of ending up as separate, possibly-duplicate content — see
 * mergeParsedAreas. */
export async function uploadKml(destinationId: string, slug: string, formData: FormData) {
  await requireContentManager();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const parsedFiles = await Promise.all(files.map(async (file) => ({ fileName: file.name, xml: await file.text() })));
  await prisma.area.deleteMany({ where: { destinationId } });
  await prisma.kmlImport.deleteMany({ where: { destinationId } });
  await importKmlFilesToDestination(prisma, destinationId, parsedFiles);

  const existingPhrasebookCount = await prisma.phrasebookEntry.count({ where: { destinationId } });
  if (existingPhrasebookCount === 0) {
    const seed = getPhrasebookSeedForSlug(slug);
    if (seed.length > 0) {
      await prisma.phrasebookEntry.createMany({
        data: seed.map((p) => ({ destinationId, ...p })),
      });
    }
  }

  const destination = await prisma.destination.findUniqueOrThrow({ where: { id: destinationId } });
  if (destination.status === "draft") {
    await prisma.destination.update({ where: { id: destinationId }, data: { status: "preview" } });
  }

  revalidateTag(`pois-${destinationId}`, "max");
  revalidateTag("destinations-list", "max");
  revalidatePath(`/admin/destinations/${slug}`);
  revalidatePath("/");
  revalidatePath(`/trip/${slug}`);
}

// ---------- AI enrichment (real photo/description/website for POIs whose
// KML data is missing or generic) ----------

// Some KML export/generator tools stamp every single placemark with the
// exact same boilerplate blurb instead of real per-place text — confirmed
// directly against a real uploaded file. A description containing one of
// these is treated the same as no description at all.
const GENERIC_DESCRIPTION_MARKERS = ["נקודה שסומנה במסלול", "מומלץ לבדוק שעות פתיחה"];

// A photo URL reused across this many or more *different* POIs in the same
// destination clearly isn't a real photo of any one of them (the same
// generator tools stamp every placemark with one or two stock images).
const GENERIC_PHOTO_MIN_REUSE = 4;

export async function getEnrichmentStatus(destinationId: string) {
  const where = { category: { area: { destinationId } }, geometryType: "point" } as const;
  const [total, remaining] = await Promise.all([
    prisma.pointOfInterest.count({ where }),
    prisma.pointOfInterest.count({ where: { ...where, enrichedAt: null } }),
  ]);
  return { total, remaining };
}

/** Enriches up to `batchSize` not-yet-processed POIs with a real photo
 * (Wikipedia), and a real description + website (Gemini with Google Search
 * grounding) — only filling in what's actually missing/generic, never
 * touching a POI's existing content when it already looks like real,
 * unique data. Processes the batch concurrently (bounded by the slowest
 * single POI's lookups, not the sum) to stay well inside the page's 60s
 * maxDuration. Call repeatedly (the client drives the loop) until
 * `remaining` reaches 0 — there's no single "enrich everything" call by
 * design, since that could run for many destination-sized minutes. */
export async function enrichDestinationPoisBatch(destinationId: string, slug: string, batchSize = 4) {
  await requireContentManager();
  const destination = await prisma.destination.findUniqueOrThrow({ where: { id: destinationId } });

  const photoRows = await prisma.poiPhoto.findMany({
    where: { poi: { category: { area: { destinationId } } } },
    select: { url: true, poiId: true },
  });
  const poiIdsByUrl = new Map<string, Set<string>>();
  for (const p of photoRows) {
    if (!poiIdsByUrl.has(p.url)) poiIdsByUrl.set(p.url, new Set());
    poiIdsByUrl.get(p.url)!.add(p.poiId);
  }
  const genericPhotoUrls = new Set(
    [...poiIdsByUrl.entries()].filter(([, poiIds]) => poiIds.size >= GENERIC_PHOTO_MIN_REUSE).map(([url]) => url)
  );

  const batch = await prisma.pointOfInterest.findMany({
    where: { category: { area: { destinationId } }, geometryType: "point", enrichedAt: null },
    include: { category: { include: { area: true } }, photos: { select: { url: true } } },
    take: batchSize,
    orderBy: { id: "asc" },
  });

  // Sequential, not Promise.all — the Gemini grounding tool hits rate/
  // capacity limits noticeably faster under a concurrent burst than one
  // request at a time (observed directly), and this is meant to reliably
  // finish eventually, not race through as fast as possible.
  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const poi of batch) {
    const descriptionText = extractTextDescription(poi.rawDescriptionHtml);
    const needsDescription = !descriptionText || GENERIC_DESCRIPTION_MARKERS.some((m) => descriptionText.includes(m));
    const hasRealPhoto = poi.photos.some((p) => !genericPhotoUrls.has(p.url));
    const needsPhoto = !hasRealPhoto;
    const needsWebsite = !poi.website;

    if (!needsDescription && !needsPhoto && !needsWebsite) {
      await prisma.pointOfInterest.update({ where: { id: poi.id }, data: { enrichedAt: new Date() } });
      continue;
    }

    const photoUrl = needsPhoto ? await findWikipediaPhoto(poi.name, poi.lat, poi.lng) : null;
    const aiResult =
      needsDescription || needsWebsite
        ? await generateDescriptionAndWebsite(poi.name, poi.category.name, poi.category.area.name, destination.name, poi.lat, poi.lng)
        : { description: null, website: null };

    await prisma.pointOfInterest.update({
      where: { id: poi.id },
      data: {
        enrichedAt: new Date(),
        ...(needsWebsite && aiResult.website ? { website: aiResult.website } : {}),
        ...(needsDescription && aiResult.description ? { rawDescriptionHtml: `<p>${escapeHtml(aiResult.description)}</p>` } : {}),
      },
    });
    if (needsPhoto && photoUrl) {
      await prisma.poiPhoto.create({ data: { poiId: poi.id, url: photoUrl } });
    }
  }

  revalidateTag(`pois-${destinationId}`, "max");
  revalidatePath(`/admin/destinations/${slug}`);
  revalidatePath(`/trip/${slug}`);

  const status = await getEnrichmentStatus(destinationId);
  return { processedInBatch: batch.length, ...status };
}

export async function updateDestinationMeta(destinationId: string, slug: string, formData: FormData) {
  await requireContentManager();
  const status = String(formData.get("status") ?? "draft");
  const tagline = String(formData.get("tagline") ?? "") || null;

  await prisma.destination.update({
    where: { id: destinationId },
    data: { status, tagline },
  });
  revalidateTag("destinations-list", "max");
  revalidatePath(`/admin/destinations/${slug}`);
  revalidatePath("/admin/destinations");
  revalidatePath("/");
}

export async function addCoupon(destinationId: string, slug: string, formData: FormData) {
  await requireContentManager();
  const partnerName = String(formData.get("partnerName") ?? "");
  const discountDesc = String(formData.get("discountDesc") ?? "");
  const code = String(formData.get("code") ?? "") || null;
  const url = String(formData.get("url") ?? "") || null;
  if (!partnerName || !discountDesc) return;

  await prisma.coupon.create({ data: { destinationId, partnerName, discountDesc, code, url } });
  revalidatePath(`/admin/destinations/${slug}`);
}

export async function deleteCoupon(couponId: string, slug: string) {
  await requireContentManager();
  await prisma.coupon.delete({ where: { id: couponId } });
  revalidatePath(`/admin/destinations/${slug}`);
}

export async function addPhrasebookEntry(destinationId: string, slug: string, formData: FormData) {
  await requireContentManager();
  const localPhrase = String(formData.get("localPhrase") ?? "");
  const translation = String(formData.get("translation") ?? "");
  const pronunciation = String(formData.get("pronunciation") ?? "") || null;
  if (!localPhrase || !translation) return;

  await prisma.phrasebookEntry.create({ data: { destinationId, localPhrase, translation, pronunciation } });
  revalidatePath(`/admin/destinations/${slug}`);
}

export async function deletePhrasebookEntry(entryId: string, slug: string) {
  await requireContentManager();
  await prisma.phrasebookEntry.delete({ where: { id: entryId } });
  revalidatePath(`/admin/destinations/${slug}`);
}
