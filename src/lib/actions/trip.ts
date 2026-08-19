"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";
import { resolveItineraryOwnerId } from "@/lib/access";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

/** The acting user's id resolved to whichever family/org co-traveler owns
 * the shared "personal" itinerary (see resolveItineraryOwnerId) — every
 * mutation that creates/looks up that itinerary should key off this instead
 * of the raw session userId, so the whole group ends up editing one shared
 * plan rather than each building a private copy. */
async function requirePersonalItineraryOwnerId() {
  const userId = await requireUserId();
  return resolveItineraryOwnerId(userId);
}

export async function toggleFavorite(poiId: string, slug: string) {
  const userId = await requireUserId();
  const existing = await prisma.favorite.findUnique({ where: { userId_poiId: { userId, poiId } } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { userId, poiId } });
  }
  revalidatePath(`/trip/${slug}/favorites`);
  revalidatePath(`/trip/${slug}/map`);
  revalidatePath(`/trip/${slug}`);
}

export async function togglePackingCheck(destinationId: string, itemKey: string, slug: string) {
  const userId = await requireUserId();
  const existing = await prisma.packingCheck.findUnique({
    where: { userId_destinationId_itemKey: { userId, destinationId, itemKey } },
  });
  if (existing) {
    await prisma.packingCheck.delete({ where: { id: existing.id } });
  } else {
    await prisma.packingCheck.create({ data: { userId, destinationId, itemKey, checked: true } });
  }
  revalidatePath(`/trip/${slug}/packing`);
}

// ---------- Map: personal saved Google-Maps pins ----------

/** Saves a place picked from Google's own POI layer onto the map — personal
 * to this user+destination only, never written into the shared destination
 * dataset other customers see. */
export async function saveMapPin(
  destinationId: string,
  slug: string,
  place: { placeId: string; name: string; lat: number; lng: number }
) {
  const userId = await requireUserId();
  await prisma.savedMapPin.upsert({
    where: { userId_destinationId_placeId: { userId, destinationId, placeId: place.placeId } },
    update: {},
    create: { userId, destinationId, placeId: place.placeId, name: place.name, lat: place.lat, lng: place.lng },
  });
  revalidatePath(`/trip/${slug}`);
}

export async function deleteSavedMapPin(id: string, slug: string) {
  const userId = await requireUserId();
  await prisma.savedMapPin.deleteMany({ where: { id, userId } });
  revalidatePath(`/trip/${slug}`);
}

export async function togglePhrasebookKnown(entryId: string, slug: string) {
  const userId = await requireUserId();
  const existing = await prisma.phrasebookProgress.findUnique({ where: { userId_entryId: { userId, entryId } } });
  if (existing) {
    await prisma.phrasebookProgress.delete({ where: { id: existing.id } });
  } else {
    await prisma.phrasebookProgress.create({ data: { userId, entryId } });
  }
  revalidatePath(`/trip/${slug}/phrasebook`);
}

export async function toggleWantsBooking(poiId: string, slug: string) {
  const poi = await prisma.pointOfInterest.findUniqueOrThrow({ where: { id: poiId } });
  await prisma.pointOfInterest.update({ where: { id: poiId }, data: { wantsBooking: !poi.wantsBooking } });
  revalidatePath(`/trip/${slug}/bookable`);
}

// ---------- Expenses ----------

export async function addExpense(destinationId: string, slug: string, formData: FormData) {
  const userId = await requireUserId();
  const category = String(formData.get("category") ?? "אחר");
  const amount = Number(formData.get("amount") ?? 0);
  const currency = String(formData.get("currency") ?? "ILS");
  const note = String(formData.get("note") ?? "") || null;
  const dateRaw = String(formData.get("spentAt") ?? "");
  if (!Number.isFinite(amount) || amount <= 0) return;

  const { convertToILS } = await import("@/lib/exchangeRates");
  const isForeign = currency !== "ILS";
  const { amountCentsIls } = await convertToILS(amount, currency);

  // Splitting: the payer (this user) picked other group members to share
  // the cost with — everyone's share is equal, and only the OTHER
  // participants get an ExpenseSplit row (their share is what they owe the
  // payer; the payer's own share is implicit, not a debt to themselves).
  const splitWith = formData.getAll("splitWith").map(String).filter(Boolean);

  await prisma.expense.create({
    data: {
      userId,
      destinationId,
      category,
      amountCents: amountCentsIls,
      note,
      spentAt: dateRaw ? new Date(dateRaw) : new Date(),
      ...(isForeign ? { originalAmountCents: Math.round(amount * 100), originalCurrency: currency } : {}),
      ...(splitWith.length > 0
        ? {
            splits: {
              create: splitWith.map((participantId) => ({
                userId: participantId,
                shareCents: Math.round(amountCentsIls / (splitWith.length + 1)),
              })),
            },
          }
        : {}),
    },
  });
  revalidatePath(`/trip/${slug}/expenses`);
}

export async function deleteExpense(expenseId: string, slug: string) {
  await prisma.expense.delete({ where: { id: expenseId } });
  revalidatePath(`/trip/${slug}/expenses`);
}

export async function setTripBudget(destinationId: string, slug: string, formData: FormData) {
  const userId = await requireUserId();
  const total = Number(formData.get("totalBudget") ?? 0);
  const tripDays = Math.max(1, Number(formData.get("tripDays") ?? 1));
  if (!Number.isFinite(total) || total <= 0) return;

  await prisma.tripBudget.upsert({
    where: { userId_destinationId: { userId, destinationId } },
    update: { totalCents: Math.round(total * 100), tripDays },
    create: { userId, destinationId, totalCents: Math.round(total * 100), tripDays },
  });
  revalidatePath(`/trip/${slug}/expenses`);
}

// ---------- Logistics ----------

/** Best-effort server-side geocode — the Maps API key is usually locked to
 * HTTP referrers for client-side use, which server requests (no browser
 * Referer header) can fail; a dedicated GOOGLE_MAPS_SERVER_API_KEY (no
 * referrer restriction) can be set to make this reliable. Never blocks
 * saving the logistics item — just skips the map pin on failure. */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const body = await res.json();
    const location = body?.results?.[0]?.geometry?.location;
    if (!location) return null;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}

export async function addLogistic(destinationId: string, slug: string, formData: FormData) {
  const userId = await requireUserId();
  const type = String(formData.get("type") ?? "flight");
  const confirmationNumber = String(formData.get("confirmationNumber") ?? "") || null;
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const address = String(formData.get("address") ?? "").trim() || null;
  const detailsJson = JSON.stringify({
    title: String(formData.get("title") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  const imageFile = formData.get("image") as File | null;
  const imageUrl = imageFile && imageFile.size > 0 ? await saveUploadedFile(imageFile, "logistics") : null;
  const geo = address ? await geocodeAddress(address) : null;

  await prisma.tripLogistic.create({
    data: {
      userId,
      destinationId,
      type,
      confirmationNumber,
      detailsJson,
      imageUrl,
      address,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
      endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
    },
  });
  revalidatePath(`/trip/${slug}/logistics`);
  revalidatePath(`/trip/${slug}/map`);
  revalidatePath(`/trip/${slug}`);
}

/** Sets (or edits) the countdown's target date+time from the "Today" screen
 * — when `logisticId` is given (the flight/logistic entry currently driving
 * the countdown), updates that row's startsAt in place so re-editing never
 * creates duplicates and stays in sync with the Logistics screen; with no
 * existing entry yet, creates the same kind of placeholder flight row as
 * before. `dateTimeStr` is a full datetime-local value ("YYYY-MM-DDTHH:mm"),
 * not just a date, so the countdown can show hours/minutes, not just days. */
export async function setTripStartDateTime(
  destinationId: string,
  slug: string,
  logisticId: string | null,
  dateTimeStr: string
) {
  const userId = await requireUserId();
  if (!dateTimeStr) return;
  const startsAt = new Date(dateTimeStr);
  if (Number.isNaN(startsAt.getTime())) return;

  if (logisticId) {
    const existing = await prisma.tripLogistic.findUnique({ where: { id: logisticId } });
    if (!existing || existing.userId !== userId) return;
    await prisma.tripLogistic.update({ where: { id: logisticId }, data: { startsAt } });
  } else {
    await prisma.tripLogistic.create({
      data: {
        userId,
        destinationId,
        type: "flight",
        detailsJson: JSON.stringify({ title: "טיסה (תאריך יעד)", notes: "" }),
        startsAt,
      },
    });
  }
  revalidatePath(`/trip/${slug}`);
  revalidatePath(`/trip/${slug}/now`);
  revalidatePath(`/trip/${slug}/logistics`);
}

export async function deleteLogistic(id: string, slug: string) {
  const userId = await requireUserId();
  const item = await prisma.tripLogistic.findUnique({ where: { id } });
  if (!item || item.userId !== userId) return;
  await prisma.tripLogistic.delete({ where: { id } });
  revalidatePath(`/trip/${slug}/logistics`);
  revalidatePath(`/trip/${slug}/map`);
  revalidatePath(`/trip/${slug}`);
}

// ---------- Itinerary (personal, silver tier) ----------

async function getOrCreateItinerary(userId: string, destinationId: string, kind: "personal" | "client", label?: string) {
  let itinerary = await prisma.itinerary.findUnique({
    where: { userId_destinationId_kind: { userId, destinationId, kind } },
  });
  if (!itinerary) {
    itinerary = await prisma.itinerary.create({ data: { userId, destinationId, kind, label } });
  }
  return itinerary;
}

export async function createItineraryDay(destinationId: string, slug: string) {
  const ownerId = await requirePersonalItineraryOwnerId();
  const itinerary = await getOrCreateItinerary(ownerId, destinationId, "personal");
  const dayCount = await prisma.itineraryDay.count({ where: { itineraryId: itinerary.id } });
  await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: dayCount + 1 } });
  revalidatePath(`/trip/${slug}/itinerary`);
}

/** Tops the shared itinerary up to at least `dayCount` days (creating any
 * missing ones, never removing extra ones) — used by the swipe-builder setup
 * step so day pills 1..N already exist before the deck starts. Returns the
 * itinerary id so the client can immediately show N day options. */
export async function ensureItineraryDayCount(destinationId: string, dayCount: number, slug: string) {
  const ownerId = await requirePersonalItineraryOwnerId();
  const itinerary = await getOrCreateItinerary(ownerId, destinationId, "personal");
  const existing = await prisma.itineraryDay.count({ where: { itineraryId: itinerary.id } });
  const toCreate = Math.max(0, Math.min(30, dayCount) - existing);
  if (toCreate > 0) {
    await prisma.$transaction(
      Array.from({ length: toCreate }, (_, i) =>
        prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: existing + i + 1 } })
      )
    );
  }
  revalidatePath(`/trip/${slug}/itinerary`);
  return { itineraryId: itinerary.id };
}

/** Adds a swiped-right card to a specific day of the shared itinerary — a
 * real POI (poiId) when it came from our own database, or a freeform
 * customLabel when it came from the AI-suggestion fallback (those have no
 * matching POI row, so no map pin — same limitation as any other custom
 * itinerary item). */
const SWIPE_DAY_ITEM_CAP = 10;
const SWIPE_DAY_START_MIN = 9 * 60; // 09:00
const SWIPE_DAY_STEP_MIN = 90; // 1.5h per stop, a reasonable default pace
const SWIPE_DAY_END_MIN = 21 * 60; // 21:00 — never auto-schedule later than this

/** Picks a plausible next time slot for a newly swiped-in stop, continuing
 * on from whatever the day's last-ordered item is already scheduled at
 * (or a flat per-slot default if nothing has a time yet) — so a day built
 * entirely through swiping still reads like a real day plan instead of
 * every stop landing at the same time. */
function nextSwipeTimeSlot(existing: { order: number; timeOfDay: string | null }[]): string {
  const last = [...existing].sort((a, b) => b.order - a.order)[0];
  let minutes: number;
  if (last?.timeOfDay) {
    const [h, m] = last.timeOfDay.split(":").map(Number);
    minutes = h * 60 + m + SWIPE_DAY_STEP_MIN;
  } else {
    minutes = SWIPE_DAY_START_MIN + existing.length * SWIPE_DAY_STEP_MIN;
  }
  minutes = Math.min(minutes, SWIPE_DAY_END_MIN);
  const hh = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mm = (minutes % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export async function addSwipedItineraryItem(
  destinationId: string,
  dayIndex: number,
  poiId: string | null,
  customLabel: string | null,
  slug: string
): Promise<{ ok: true } | { error: string }> {
  const ownerId = await requirePersonalItineraryOwnerId();
  const itinerary = await getOrCreateItinerary(ownerId, destinationId, "personal");
  let day = await prisma.itineraryDay.findFirst({ where: { itineraryId: itinerary.id, dayIndex } });
  if (!day) day = await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex } });

  const existing = await prisma.itineraryItem.findMany({
    where: { itineraryDayId: day.id },
    select: { order: true, timeOfDay: true },
  });
  if (existing.length >= SWIPE_DAY_ITEM_CAP) {
    return { error: `יום ${dayIndex} כבר מלא (מקסימום ${SWIPE_DAY_ITEM_CAP} נקודות ליום) — בחרו יום אחר` };
  }

  await prisma.itineraryItem.create({
    data: {
      itineraryDayId: day.id,
      order: existing.length,
      timeOfDay: nextSwipeTimeSlot(existing),
      ...(poiId ? { poiId } : { customLabel: (customLabel ?? "אטרקציה").slice(0, 120) }),
    },
  });
  revalidatePath(`/trip/${slug}/itinerary`);
  return { ok: true };
}

export type SwipeDeckCard = {
  poiId: string;
  name: string;
  categoryName: string;
  areaName: string;
  photoUrl: string | null;
  description: string | null;
  tags: string[];
  isMustSee: boolean;
};

// Enough cards for a long swiping session without shipping a destination's
// entire POI set (some run 1000-2000+) to the client just for the deck.
const SWIPE_DECK_MAX_CARDS = 80;

/** Builds the swipe deck on demand (called once the builder's setup step is
 * submitted) instead of the page shipping every one of a destination's POIs
 * to the browser up front — for a big destination that upfront payload was
 * the actual cause of the builder feeling slow to open. Filters to the
 * chosen categories (all, if none chosen), excludes POIs already in the
 * itinerary, and orders by the same must-see-first / tag-richness heuristic
 * used as a stand-in for real popularity data. */
export async function buildSwipeDeck(
  destinationId: string,
  categories: string[],
  excludePoiIds: string[]
): Promise<SwipeDeckCard[]> {
  await requireUserId();
  const { getFlatPoisForDestination, extractTextDescription } = await import("@/lib/data/pois");
  const pois = await getFlatPoisForDestination(destinationId);
  const excludeSet = new Set(excludePoiIds);

  const filtered = pois.filter(
    (p) => !excludeSet.has(p.id) && (categories.length === 0 || categories.includes(p.categoryName))
  );
  filtered.sort((a, b) => {
    if (a.isMustSee !== b.isMustSee) return a.isMustSee ? -1 : 1;
    return b.tags.length - a.tags.length;
  });

  return filtered.slice(0, SWIPE_DECK_MAX_CARDS).map((p) => ({
    poiId: p.id,
    name: p.name,
    categoryName: p.categoryName,
    areaName: p.areaName,
    photoUrl: p.photoUrl,
    description: extractTextDescription(p.description, 160),
    tags: p.tags,
    isMustSee: p.isMustSee,
  }));
}

/** Asks Gemini for a handful of extra tourist-recommended spots for this
 * destination (optionally narrowed to the chosen category names) to keep the
 * swipe deck going once our own POI database for that filter is exhausted.
 * Best-effort: no API key or a failed/malformed response just yields no
 * extra cards rather than erroring the whole builder. No coordinates are
 * requested (an LLM's guess at lat/lng for a lesser-known spot is unreliable
 * enough to risk a wrong map pin) — these become customLabel items if added. */
export async function fetchAiSuggestedPois(
  destinationName: string,
  categories: string[],
  excludeNames: string[]
): Promise<{ name: string; description: string }[]> {
  await requireUserId();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  try {
    const categoryHint = categories.length > 0 ? `בתחומי העניין: ${categories.join(", ")}` : "בכל תחום";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: `הציעו עד 8 אטרקציות/מקומות אמיתיים ומומלצים ל${destinationName} ${categoryHint}, שאינם ברשימת השמות הבאה שכבר קיימת: ${JSON.stringify(excludeNames.slice(0, 200))}. החזירו אך ורק JSON בצורה [{"name": "...", "description": "..."}], עם description קצר (עד 25 מילים) בעברית שמסביר למה זה שווה ביקור. אל תמציאו מקומות שלא קיימים באמת.`,
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: `הצעות נוספות ל${destinationName}` }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const match = text?.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is { name: string; description: string } =>
          p && typeof p.name === "string" && typeof p.description === "string"
      )
      .slice(0, 8);
  } catch {
    return [];
  }
}

/** Toggle-style like/dislike, one per user per item — clicking the same
 * value again clears your vote instead of doubling up. Counts are shown to
 * everyone sharing the itinerary so the group can spot unpopular stops. */
export async function voteItineraryItem(itemId: string, value: 1 | -1, slug: string) {
  const userId = await requireUserId();
  const existing = await prisma.itineraryItemVote.findUnique({
    where: { itineraryItemId_userId: { itineraryItemId: itemId, userId } },
  });
  if (existing && existing.value === value) {
    await prisma.itineraryItemVote.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.itineraryItemVote.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.itineraryItemVote.create({ data: { itineraryItemId: itemId, userId, value } });
  }
  revalidatePath(`/trip/${slug}/itinerary`);
}

/** Deletes a day (and its items, via cascade) and renumbers the remaining
 * days sequentially so there's no gap in the "יום N" labels. */
export async function deleteItineraryDay(dayId: string, slug: string, path = "itinerary") {
  const day = await prisma.itineraryDay.findUnique({ where: { id: dayId } });
  if (!day) return;

  await prisma.itineraryDay.delete({ where: { id: dayId } });

  const remaining = await prisma.itineraryDay.findMany({
    where: { itineraryId: day.itineraryId },
    orderBy: { dayIndex: "asc" },
  });
  await prisma.$transaction(
    remaining.map((d, i) => prisma.itineraryDay.update({ where: { id: d.id }, data: { dayIndex: i + 1 } }))
  );

  revalidatePath(`/trip/${slug}/${path}`);
}

export async function addItineraryItem(itineraryDayId: string, poiId: string, slug: string) {
  const count = await prisma.itineraryItem.count({ where: { itineraryDayId } });
  await prisma.itineraryItem.create({ data: { itineraryDayId, poiId, order: count } });
  revalidatePath(`/trip/${slug}/itinerary`);
}

export async function addCustomItineraryItem(itineraryDayId: string, slug: string, formData: FormData) {
  const customLabel = String(formData.get("customLabel") ?? "").trim();
  if (!customLabel) return;
  const count = await prisma.itineraryItem.count({ where: { itineraryDayId } });
  await prisma.itineraryItem.create({ data: { itineraryDayId, customLabel, order: count } });
  revalidatePath(`/trip/${slug}/itinerary`);
}

export async function removeItineraryItem(itemId: string, slug: string) {
  await prisma.itineraryItem.delete({ where: { id: itemId } });
  revalidatePath(`/trip/${slug}/itinerary`);
}

/** Saves a traveler's freeform personal note under a single itinerary stop
 * (e.g. "get here before 9am to skip the line"). No revalidatePath — the
 * input already shows what was typed, and refetching mid-edit would fight
 * the debounced autosave. */
export async function setItineraryItemNote(itemId: string, note: string) {
  await prisma.itineraryItem.update({ where: { id: itemId }, data: { note: note.trim() || null } });
}

/**
 * Persists a new item order within a day after a drag-and-drop reorder.
 * The day's existing time-of-day values (sorted) are reassigned to the new
 * item sequence, so moving an item also moves its time slot — matching what
 * the user sees when they drag a card to a new position.
 */
export async function reorderItineraryDay(dayId: string, orderedItemIds: string[], slug: string, path = "itinerary") {
  const items = await prisma.itineraryItem.findMany({ where: { itineraryDayId: dayId }, orderBy: { order: "asc" } });
  // The time slot that belonged to position N stays at position N — so dragging an
  // item into a new slot carries that slot's time, effectively swapping the times.
  const timesByPosition = items.map((i) => i.timeOfDay);

  await prisma.$transaction(
    orderedItemIds.map((itemId, index) =>
      prisma.itineraryItem.update({
        where: { id: itemId },
        data: { order: index, timeOfDay: timesByPosition[index] ?? null },
      })
    )
  );
  revalidatePath(`/trip/${slug}/${path}`);
}

/** Moves a stop to a different day directly from the map's marker popup —
 * appended at the end of the target day with an auto-assigned time (same
 * nextSwipeTimeSlot heuristic the swipe builder uses), so a day built partly
 * by dragging pins around still ends up with a sensible time-ordered plan.
 * Same 10-stops/day cap as the swipe builder, for the same reason. */
export async function moveItineraryItemToDay(
  itemId: string,
  newDayIndex: number,
  slug: string,
  path = "itinerary"
): Promise<{ ok: true } | { error: string }> {
  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId }, include: { day: true } });
  if (!item) return { error: "הנקודה לא נמצאה" };
  if (item.day.dayIndex === newDayIndex) return { ok: true };

  let targetDay = await prisma.itineraryDay.findFirst({ where: { itineraryId: item.day.itineraryId, dayIndex: newDayIndex } });
  if (!targetDay) targetDay = await prisma.itineraryDay.create({ data: { itineraryId: item.day.itineraryId, dayIndex: newDayIndex } });

  const existing = await prisma.itineraryItem.findMany({
    where: { itineraryDayId: targetDay.id },
    select: { order: true, timeOfDay: true },
  });
  if (existing.length >= SWIPE_DAY_ITEM_CAP) {
    return { error: `יום ${newDayIndex} כבר מלא (מקסימום ${SWIPE_DAY_ITEM_CAP} נקודות ליום)` };
  }

  await prisma.itineraryItem.update({
    where: { id: itemId },
    data: { itineraryDayId: targetDay.id, order: existing.length, timeOfDay: nextSwipeTimeSlot(existing) },
  });
  revalidatePath(`/trip/${slug}/${path}`);
  return { ok: true };
}

// ---------- Planner branding (gold tier) ----------

export async function savePlannerProfile(slug: string, formData: FormData) {
  const userId = await requireUserId();
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const logoFile = formData.get("logo") as File | null;
  const logoUrl = logoFile && logoFile.size > 0 ? await saveUploadedFile(logoFile, "planner-logos") : undefined;

  await prisma.plannerProfile.upsert({
    where: { userId },
    update: { companyName, ...(logoUrl ? { logoUrl } : {}) },
    create: { userId, companyName, logoUrl: logoUrl ?? null },
  });
  revalidatePath(`/trip/${slug}/client-planner`);
}

// ---------- Client planner (gold tier) ----------

export async function ensureClientItinerary(destinationId: string, slug: string) {
  const userId = await requireUserId();
  await getOrCreateItinerary(userId, destinationId, "client", "מסלול ללקוח");
  revalidatePath(`/trip/${slug}/client-planner`);
}

export async function createClientItineraryDay(destinationId: string, slug: string) {
  const userId = await requireUserId();
  const itinerary = await getOrCreateItinerary(userId, destinationId, "client");
  const dayCount = await prisma.itineraryDay.count({ where: { itineraryId: itinerary.id } });
  await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: dayCount + 1 } });
  revalidatePath(`/trip/${slug}/client-planner`);
}

type TemplateDaySnapshot = {
  dayIndex: number;
  note: string | null;
  items: { poiId: string | null; customLabel: string | null; timeOfDay: string | null; note: string | null; order: number }[];
};

/** Snapshots an itinerary's current days/items as a reusable template — a
 * saved starting point (for a future client, or one of a paying user's own
 * saved trip plans), not a live link to this itinerary (editing the
 * template later won't change the itinerary it was saved from). Shared
 * "personal" itineraries save under the group's resolved owner id, same as
 * the itinerary itself, so every co-traveler sees the same saved list. */
export async function saveItineraryAsTemplate(
  destinationId: string,
  slug: string,
  name: string,
  kind: "personal" | "client" = "client"
) {
  const userId = kind === "personal" ? await requirePersonalItineraryOwnerId() : await requireUserId();
  const itinerary = await prisma.itinerary.findUnique({
    where: { userId_destinationId_kind: { userId, destinationId, kind } },
    include: { days: { orderBy: { dayIndex: "asc" }, include: { items: { orderBy: { order: "asc" } } } } },
  });
  if (!itinerary || itinerary.days.length === 0) return { error: "אין עדיין מסלול לשמור" };

  const snapshot: TemplateDaySnapshot[] = itinerary.days.map((d) => ({
    dayIndex: d.dayIndex,
    note: d.note,
    items: d.items.map((i) => ({ poiId: i.poiId, customLabel: i.customLabel, timeOfDay: i.timeOfDay, note: i.note, order: i.order })),
  }));

  await prisma.itineraryTemplate.create({
    data: { userId, destinationId, kind, name: name.trim() || "מסלול ללא שם", daysJson: JSON.stringify(snapshot) },
  });
  revalidatePath(`/trip/${slug}/${kind === "personal" ? "itinerary" : "client-planner"}`);
  return { ok: true };
}

/** The saved-itinerary list for the version-switcher dropdown. */
export async function listItineraryTemplates(destinationId: string, kind: "personal" | "client" = "client") {
  const userId = kind === "personal" ? await requirePersonalItineraryOwnerId() : await requireUserId();
  return prisma.itineraryTemplate.findMany({
    where: { userId, destinationId, kind },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });
}

/** Clears the active itinerary's days without saving anything — the
 * "delete and start fresh" branch of the builder's save-or-discard prompt.
 * Also used as the "make room" step before writing a picked template's
 * snapshot (applyItineraryTemplate does this itself too; harmless if run
 * twice on an already-empty itinerary). */
export async function clearActiveItineraryDays(destinationId: string, slug: string, kind: "personal" | "client" = "personal") {
  const userId = kind === "personal" ? await requirePersonalItineraryOwnerId() : await requireUserId();
  const itinerary = await getOrCreateItinerary(userId, destinationId, kind);
  await prisma.itineraryDay.deleteMany({ where: { itineraryId: itinerary.id } });
  revalidatePath(`/trip/${slug}/${kind === "personal" ? "itinerary" : "client-planner"}`);
}

/** Replaces the client itinerary's current days/items with a saved template's snapshot. */
export async function applyItineraryTemplate(
  templateId: string,
  destinationId: string,
  slug: string,
  kind: "personal" | "client" = "client"
) {
  const userId = kind === "personal" ? await requirePersonalItineraryOwnerId() : await requireUserId();
  const template = await prisma.itineraryTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.userId !== userId || template.kind !== kind) return;

  const itinerary = await getOrCreateItinerary(userId, destinationId, kind);
  await prisma.itineraryDay.deleteMany({ where: { itineraryId: itinerary.id } });

  const snapshot = JSON.parse(template.daysJson) as TemplateDaySnapshot[];
  for (const day of snapshot) {
    const createdDay = await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: day.dayIndex, note: day.note } });
    for (const item of day.items) {
      await prisma.itineraryItem.create({
        data: { itineraryDayId: createdDay.id, poiId: item.poiId, customLabel: item.customLabel, timeOfDay: item.timeOfDay, note: item.note, order: item.order },
      });
    }
  }
  revalidatePath(`/trip/${slug}/${kind === "personal" ? "itinerary" : "client-planner"}`);
}

export async function deleteItineraryTemplate(templateId: string, slug: string, kind: "personal" | "client" = "client") {
  const userId = kind === "personal" ? await requirePersonalItineraryOwnerId() : await requireUserId();
  const template = await prisma.itineraryTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.userId !== userId) return;
  await prisma.itineraryTemplate.delete({ where: { id: templateId } });
  revalidatePath(`/trip/${slug}/${kind === "personal" ? "itinerary" : "client-planner"}`);
}

export async function addClientItineraryItem(itineraryDayId: string, slug: string, formData: FormData) {
  const poiId = String(formData.get("poiId") ?? "") || null;
  const customLabel = String(formData.get("customLabel") ?? "").trim() || null;
  const timeOfDay = String(formData.get("timeOfDay") ?? "") || null;
  if (!poiId && !customLabel) return;

  const count = await prisma.itineraryItem.count({ where: { itineraryDayId } });
  await prisma.itineraryItem.create({
    data: { itineraryDayId, poiId, customLabel, timeOfDay, order: count },
  });
  revalidatePath(`/trip/${slug}/client-planner`);
}

/**
 * "Save & optimize": regroups every POI-backed item across all days using
 * geographic clustering + nearest-neighbor ordering (see routeOptimizer.ts).
 * Items without coordinates (freeform custom stops) stay pinned to whichever
 * day they were added to. This is algorithmic distance optimization, not
 * real transit-line routing — we don't fabricate bus/metro directions.
 */
export async function optimizeClientItinerary(itineraryId: string, slug: string) {
  const { optimizeAcrossDays } = await import("@/lib/routeOptimizer");

  const itinerary = await prisma.itinerary.findUniqueOrThrow({
    where: { id: itineraryId },
    include: { days: { orderBy: { dayIndex: "asc" }, include: { items: { include: { poi: true } } } } },
  });

  const numDays = itinerary.days.length;
  if (numDays === 0) return;

  const geoItems = itinerary.days
    .flatMap((d) => d.items)
    .filter((i) => i.poi)
    .map((i) => ({ id: i.id, lat: i.poi!.lat, lng: i.poi!.lng }));
  const freeformItems = itinerary.days.flatMap((d) => d.items.filter((i) => !i.poi).map((i) => ({ ...i, originalDayId: d.id })));

  const grouped = optimizeAcrossDays(geoItems, numDays);

  await prisma.$transaction(async (tx) => {
    for (let dayIdx = 0; dayIdx < itinerary.days.length; dayIdx++) {
      const dayId = itinerary.days[dayIdx].id;
      const itemsForDay = grouped[dayIdx] ?? [];
      for (let order = 0; order < itemsForDay.length; order++) {
        await tx.itineraryItem.update({
          where: { id: itemsForDay[order].id },
          data: { itineraryDayId: dayId, order },
        });
      }
    }
    // Freeform items keep their day but move to the end of that day's order.
    for (const item of freeformItems) {
      const dayId = item.originalDayId;
      const geoCountInDay = grouped[itinerary.days.findIndex((d) => d.id === dayId)]?.length ?? 0;
      await tx.itineraryItem.update({ where: { id: item.id }, data: { order: geoCountInDay + 1000 } });
    }
  });

  revalidatePath(`/trip/${slug}/client-planner`);
}

/** Lets the itinerary wizard accept a free-text description ("אני אוהב אוכל
 * טוב ומוזיאונים, פחות קניות" or "רק בפראג עצמה, בלי לצאת מהעיר") instead of
 * forcing category/area checkboxes — asks Gemini to pick the matching
 * category AND area names from the destination's actual lists (so it can
 * never invent one that doesn't exist, and so an explicit "stay in the city
 * itself" request actually excludes any separate road-trip/day-trip area
 * rather than silently mixing every area's POIs together), falling back to a
 * plain substring match if Gemini is unavailable/fails. Both returned
 * arrays are empty (meaning "no restriction") when nothing in the text
 * implies a restriction, rather than risking an empty itinerary. */
async function resolveFreeTextIntent(
  freeText: string,
  availableCategories: string[],
  availableAreas: string[]
): Promise<{ categories: string[]; areas: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: `בהינתן תיאור חופשי של מטייל, רשימת הקטגוריות הזמינות ביעד, ורשימת האזורים/הערים הזמינות ביעד (חלק מהיעדים כוללים גם אזור "Road Trip" נפרד לטיולי יום/יציאות מהעיר המרכזית, בנוסף לעיר עצמה) — החזירו אך ורק אובייקט JSON (ללא טקסט נוסף) בצורה {"categories": [...], "areas": [...]}, עם שמות בדיוק כפי שהם כתובים ברשימות הנתונות. בשדה categories: הקטגוריות הרלוונטיות לתחומי העניין שתוארו, או מערך ריק אם לא צוין דבר. בשדה areas: אם המטייל ציין באופן מפורש שהוא רוצה להישאר רק בעיר/אזור מסוים ולא לצאת ממנו (למשל "רק בפראג עצמה", "בתוך העיר בלבד", "בלי לצאת מהעיר", "בלי road trip") — החזירו רק את שם האזור הראשי המתאים (בדרך כלל שם העיר, לא "Road Trip"). אם לא צוינה הגבלה על אזור, החזירו מערך ריק. קטגוריות זמינות: ${JSON.stringify(availableCategories)}. אזורים זמינים: ${JSON.stringify(availableAreas)}`,
                },
              ],
            },
            contents: [{ role: "user", parts: [{ text: freeText }] }],
            generationConfig: { maxOutputTokens: 256, temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const match = text?.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const categories = Array.isArray(parsed?.categories)
            ? parsed.categories.filter((c: unknown): c is string => typeof c === "string" && availableCategories.includes(c))
            : [];
          const areas = Array.isArray(parsed?.areas)
            ? parsed.areas.filter((a: unknown): a is string => typeof a === "string" && availableAreas.includes(a))
            : [];
          if (categories.length > 0 || areas.length > 0) return { categories, areas };
        }
      }
    } catch {
      // fall through to the keyword fallback below
    }
  }

  const lower = freeText.toLowerCase();
  return {
    categories: availableCategories.filter((c) => lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower)),
    areas: availableAreas.filter((a) => a.toLowerCase() !== "road trip" && lower.includes(a.toLowerCase())),
  };
}

/**
 * Public "generate my itinerary" wizard: picks POIs matching the traveler's
 * chosen categories/areas and hands them to the shared scheduler (must-see
 * landmarks prioritized first, 7 stops/day with a lunch + evening food slot
 * woven in near each day's cluster — see itineraryScheduler.ts). Replaces
 * whatever personal itinerary already existed for this destination.
 */
export async function generateItineraryFromPreferences(destinationId: string, slug: string, formData: FormData) {
  const { scheduleItineraryDays } = await import("@/lib/itineraryScheduler");
  const userId = await requireUserId();

  const tripDays = Math.max(1, Math.min(14, Number(formData.get("tripDays") ?? 3)));
  let categories = formData.getAll("categories").map(String);
  let areas = formData.getAll("areas").map(String);
  const freeText = String(formData.get("freeText") ?? "").trim();

  if (freeText && categories.length === 0 && areas.length === 0) {
    const [allCategoryNames, allAreas] = await Promise.all([
      prisma.category.findMany({ where: { area: { destinationId } }, select: { name: true } }),
      prisma.area.findMany({ where: { destinationId }, select: { id: true, name: true } }),
    ]);
    const resolved = await resolveFreeTextIntent(
      freeText,
      [...new Set(allCategoryNames.map((c) => c.name))],
      allAreas.map((a) => a.name)
    );
    categories = resolved.categories;
    areas = allAreas.filter((a) => resolved.areas.includes(a.name)).map((a) => a.id);
  }

  const [rows, hotel] = await Promise.all([
    prisma.pointOfInterest.findMany({
      where: {
        geometryType: "point",
        category: {
          ...(categories.length > 0 ? { name: { in: categories } } : {}),
          area: {
            destinationId,
            ...(areas.length > 0 ? { id: { in: areas } } : {}),
          },
        },
      },
      include: { photos: { take: 1 }, category: { select: { name: true } } },
      take: 600,
    }),
    prisma.tripLogistic.findFirst({
      where: { userId, destinationId, type: "hotel", lat: { not: null }, lng: { not: null } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  if (rows.length === 0) return { error: "לא נמצאו נקודות מתאימות לבחירה שלכם" };

  const candidates = rows.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    isMustSee: p.isMustSee,
    hasPhoto: p.photos.length > 0,
    categoryName: p.category.name,
  }));
  const hotelAnchor = hotel?.lat != null && hotel?.lng != null ? { lat: hotel.lat, lng: hotel.lng } : null;

  const ownerId = await resolveItineraryOwnerId(userId);
  const itinerary = await getOrCreateItinerary(ownerId, destinationId, "personal");
  await prisma.itineraryDay.deleteMany({ where: { itineraryId: itinerary.id } });

  const scheduledDays = scheduleItineraryDays(candidates, tripDays, hotelAnchor);
  for (let dayIdx = 0; dayIdx < tripDays; dayIdx++) {
    const day = await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: dayIdx + 1 } });
    for (const stop of scheduledDays[dayIdx] ?? []) {
      await prisma.itineraryItem.create({
        data: { itineraryDayId: day.id, poiId: stop.poiId, order: stop.order, timeOfDay: stop.timeOfDay },
      });
    }
  }

  revalidatePath(`/trip/${slug}/itinerary`);
  return { ok: true };
}

export async function setItineraryShareEnabled(itineraryId: string, slug: string, path: string) {
  const itinerary = await prisma.itinerary.findUniqueOrThrow({ where: { id: itineraryId } });
  if (!itinerary.shareToken) {
    await prisma.itinerary.update({ where: { id: itineraryId }, data: { shareToken: crypto.randomUUID() } });
  }
  revalidatePath(`/trip/${slug}/${path}`);
}
