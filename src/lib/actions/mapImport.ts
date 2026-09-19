"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hasAccessToDestination, getAiChatDailyQuota } from "@/lib/access";
import { consumeAiChatQuota } from "@/lib/aiChatQuota";
import { requireSessionUserId } from "@/lib/groupAccess";
import { logGroupActivity } from "@/lib/groupActivity";
import { geminiGenerate } from "@/lib/gemini";
import { SAVED_PIN_CATEGORY_OPTIONS } from "@/lib/mapStyles";
import type { ResolvedPin } from "@/lib/googlePlaceDetails";

const MAX_PINS_PER_SAVE = 100;

const httpUrl = (v: unknown): string | null => {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
};
const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Saves a batch of already-resolved places (from a Google list import, a
 * place search or the AI map builder) as this trip group's shared pins. The
 * browser did the Google lookups, so every field here is untrusted input and
 * is re-validated. Places already saved by this user are skipped. */
export async function saveResolvedPins(
  destinationId: string,
  slug: string,
  pins: ResolvedPin[],
  source: "google_list" | "ai" | "manual"
): Promise<{ saved: number; skipped: number }> {
  const userId = await requireSessionUserId();
  if (!(await hasAccessToDestination(userId, destinationId))) throw new Error("אין גישה ליעד הזה");
  if (!Array.isArray(pins) || pins.length === 0) return { saved: 0, skipped: 0 };

  const rows = pins.slice(0, MAX_PINS_PER_SAVE).flatMap((p) => {
    const name = text(p.name, 120);
    if (!name || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) return [];
    const d = p.details;
    let openingHours: string | null = null;
    if (d?.hours && Array.isArray(d.hours) && d.hours.every((h) => typeof h === "string")) {
      openingHours = JSON.stringify(d.hours.slice(0, 7).map((h) => h.slice(0, 120)));
    }
    const category = p.categoryName && SAVED_PIN_CATEGORY_OPTIONS.includes(p.categoryName) ? p.categoryName : "אחר";
    const rating = typeof d?.rating === "number" && d.rating > 0 && d.rating <= 5 ? d.rating : null;
    const ratingCount = typeof d?.ratingCount === "number" && d.ratingCount > 0 ? Math.round(d.ratingCount) : null;
    return [
      {
        userId,
        destinationId,
        placeId: text(p.placeId, 200) ?? `import:${randomUUID()}`,
        name,
        lat: p.lat,
        lng: p.lng,
        description: text(p.note, 500),
        categoryName: category,
        photoUrl: httpUrl(d?.photoUrl),
        address: text(d?.address, 300),
        phone: text(d?.phone, 40),
        website: httpUrl(d?.website),
        googleUrl: httpUrl(d?.url),
        rating,
        ratingCount,
        openingHours,
        source,
      },
    ];
  });

  const result = await prisma.savedMapPin.createMany({ data: rows, skipDuplicates: true });
  if (result.count > 0) {
    await logGroupActivity(userId, {
      type: "pins_imported",
      summary: result.count === 1 ? `הוסיף/ה את “${rows[0].name}” למפה` : `הוסיף/ה ${result.count} נקודות חדשות למפה`,
      destinationId,
      slug,
    });
  }
  revalidatePath(`/trip/${slug}`);
  return { saved: result.count, skipped: pins.length - result.count };
}

export type AiPlaceSuggestion = { query: string; category: string | null; why: string | null };

/** The AI half of "build a map with AI": asks Gemini for real, well-known
 * places matching the request. Names only - the browser then verifies every
 * one against Google Places and drops anything that doesn't exist, so a
 * hallucinated place never reaches the map. Counts against the same daily AI
 * quota as the chat. */
export async function aiSuggestPlaces(
  destinationId: string,
  prompt: string
): Promise<{ suggestions: AiPlaceSuggestion[] } | { error: string }> {
  const userId = await requireSessionUserId();
  if (!(await hasAccessToDestination(userId, destinationId))) return { error: "אין גישה ליעד הזה" };
  const request = prompt.trim().slice(0, 400);
  if (request.length < 3) return { error: "תארו במשפט מה לחפש - למשל: בתי קפה טובים ליד הנהר" };

  const quota = await getAiChatDailyQuota(userId);
  if (quota !== null) {
    const { allowed } = await consumeAiChatQuota(userId, quota);
    if (!allowed) return { error: `הגעתם למכסת ${quota} ההודעות היומיות ל-AI - היא מתאפסת מחר.` };
  }

  const destination = await prisma.destination.findUnique({ where: { id: destinationId }, select: { name: true } });
  const system = `אתם מומחי טיולים. המשתמש בונה מפה אישית ביעד "${destination?.name ?? ""}". החזירו JSON בלבד: מערך של עד 12 אובייקטים {"name": שם המקום כפי שמופיע בגוגל מפות, "area": העיר או השכונה, "category": אחת מ-${SAVED_PIN_CATEGORY_OPTIONS.join(" / ")}, "why": משפט קצר בעברית}. חובה: רק מקומות אמיתיים, מוכרים וקיימים כיום ביעד. אם אינכם בטוחים שמקום קיים - אל תכללו אותו.`;

  try {
    const res = await geminiGenerate(
      {
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: request }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.4,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      15000
    );
    if (!res) return { error: "ה-AI לא זמין כרגע - נסו שוב בעוד רגע" };
    if (!res.ok) return { error: "ה-AI לא הצליח כרגע - נסו שוב בעוד רגע" };
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return { error: "ה-AI החזיר תשובה לא צפויה - נסו לנסח מחדש" };
    const suggestions = parsed.slice(0, 12).flatMap((s: Record<string, unknown>) => {
      const name = text(s.name, 120);
      if (!name) return [];
      const area = text(s.area, 80);
      const category = typeof s.category === "string" && SAVED_PIN_CATEGORY_OPTIONS.includes(s.category) ? s.category : null;
      return [{ query: [name, area, destination?.name].filter(Boolean).join(", "), category, why: text(s.why, 160) }];
    });
    return { suggestions };
  } catch {
    return { error: "ה-AI לא הצליח כרגע - נסו שוב בעוד רגע" };
  }
}
