"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
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
  const note = String(formData.get("note") ?? "") || null;
  const dateRaw = String(formData.get("spentAt") ?? "");
  if (!Number.isFinite(amount) || amount <= 0) return;

  await prisma.expense.create({
    data: {
      userId,
      destinationId,
      category,
      amountCents: Math.round(amount * 100),
      note,
      spentAt: dateRaw ? new Date(dateRaw) : new Date(),
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

export async function addLogistic(destinationId: string, slug: string, formData: FormData) {
  const userId = await requireUserId();
  const type = String(formData.get("type") ?? "flight");
  const confirmationNumber = String(formData.get("confirmationNumber") ?? "") || null;
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const detailsJson = JSON.stringify({
    title: String(formData.get("title") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  const imageFile = formData.get("image") as File | null;
  const imageUrl = imageFile && imageFile.size > 0 ? await saveUploadedFile(imageFile, "logistics") : null;

  await prisma.tripLogistic.create({
    data: {
      userId,
      destinationId,
      type,
      confirmationNumber,
      detailsJson,
      imageUrl,
      startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
      endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
    },
  });
  revalidatePath(`/trip/${slug}/logistics`);
}

export async function deleteLogistic(id: string, slug: string) {
  await prisma.tripLogistic.delete({ where: { id } });
  revalidatePath(`/trip/${slug}/logistics`);
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
  const userId = await requireUserId();
  const itinerary = await getOrCreateItinerary(userId, destinationId, "personal");
  const dayCount = await prisma.itineraryDay.count({ where: { itineraryId: itinerary.id } });
  await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: dayCount + 1 } });
  revalidatePath(`/trip/${slug}/itinerary`);
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

/**
 * Public "generate my itinerary" wizard: picks POIs matching the traveler's
 * chosen categories/areas (preferring ones with a photo), splits them across
 * the requested number of days using the same geographic optimizer as the
 * client planner, and assigns spaced-out default start times. This replaces
 * whatever personal itinerary already existed for this destination.
 */
export async function generateItineraryFromPreferences(destinationId: string, slug: string, formData: FormData) {
  const { optimizeAcrossDays } = await import("@/lib/routeOptimizer");
  const userId = await requireUserId();

  const tripDays = Math.max(1, Math.min(14, Number(formData.get("tripDays") ?? 3)));
  const perDay = Math.max(2, Math.min(8, Number(formData.get("perDay") ?? 5)));
  const categories = formData.getAll("categories").map(String);
  const areas = formData.getAll("areas").map(String);

  const pois = await prisma.pointOfInterest.findMany({
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
    include: { photos: { take: 1 } },
    take: 400,
  });

  if (pois.length === 0) return { error: "לא נמצאו נקודות מתאימות לבחירה שלכם" };

  const withPhoto = pois.filter((p) => p.photos.length > 0);
  const pool = (withPhoto.length >= tripDays * perDay ? withPhoto : pois).slice(0, tripDays * perDay);

  const itinerary = await getOrCreateItinerary(userId, destinationId, "personal");
  await prisma.itineraryDay.deleteMany({ where: { itineraryId: itinerary.id } });

  const grouped = optimizeAcrossDays(
    pool.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    tripDays
  );

  for (let dayIdx = 0; dayIdx < tripDays; dayIdx++) {
    const day = await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: dayIdx + 1 } });
    const items = grouped[dayIdx] ?? [];
    let minutes = 9 * 60; // start at 09:00
    for (let order = 0; order < items.length; order++) {
      const timeOfDay = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      await prisma.itineraryItem.create({
        data: { itineraryDayId: day.id, poiId: items[order].id, order, timeOfDay },
      });
      minutes += 105; // ~1h45 per stop including travel
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
