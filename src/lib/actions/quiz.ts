"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAccessToDestination } from "@/lib/access";
import { scheduleItineraryDays, TOTAL_STOPS_PER_DAY } from "@/lib/itineraryScheduler";
import type { QuizAnswers, VibeTag } from "@/lib/destinationVibes";

const VIBE_KEYWORDS: Record<VibeTag, string[]> = {
  food: ["מסעד", "אוכל", "קפה", "בראנץ", "גלידה"],
  nightlife: ["בר", "חיי לילה", "מסיב"],
  nature: ["פארק", "טבע", "אגם", "הר"],
  culture: ["מוזיאון", "כללי", "אטרקצי"],
  history: ["מוזיאון", "כללי", "אטרקצי"],
  beach: ["חוף", "ים"],
  shopping: ["קניון", "שופינג", "שוק"],
  romantic: ["אטרקצי", "כללי"],
  family: ["אטרקצי", "פארק", "כללי"],
  relaxation: ["פארק", "כללי"],
  adventure: ["אטרקצי", "כללי"],
  luxury: ["אטרקצי", "כללי"],
  budget: ["אטרקצי", "כללי"],
  winter: ["אטרקצי", "כללי"],
};

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

/**
 * Paid quiz result: auto-populates a personal itinerary, trip budget, and a
 * starter set of favorites for the matched destination, using the same
 * geographic-optimization + POI-selection logic as the itinerary wizard —
 * driven by the quiz answers, not a live AI call. Requires the user to
 * already have subscription access to the destination.
 */
export async function generatePersonalizedSetup(
  destinationId: string,
  slug: string,
  answers: QuizAnswers
): Promise<{ ok: false; error: string } | { ok: true; itemCount: number; favoriteCount: number }> {
  const userId = await requireUserId();
  const allowed = await hasAccessToDestination(userId, destinationId);
  if (!allowed) return { ok: false, error: "צריך מנוי פעיל שכולל את היעד הזה" };

  const keywords = Array.from(new Set(answers.vibes.flatMap((v) => VIBE_KEYWORDS[v] ?? [])));
  const [pool, hotel] = await Promise.all([
    prisma.pointOfInterest.findMany({
      where: {
        geometryType: "point",
        category: {
          area: { destinationId },
          OR: keywords.length > 0 ? keywords.map((k) => ({ name: { contains: k } })) : undefined,
        },
      },
      include: { photos: { take: 1 }, category: { select: { name: true } } },
      take: answers.tripDays * TOTAL_STOPS_PER_DAY * 2,
    }),
    prisma.tripLogistic.findFirst({
      where: { userId, destinationId, type: "hotel", lat: { not: null }, lng: { not: null } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  if (pool.length === 0) return { ok: false, error: "לא נמצאו מספיק נקודות מתאימות ליעד הזה" };
  const hotelAnchor = hotel?.lat != null && hotel?.lng != null ? { lat: hotel.lat, lng: hotel.lng } : null;

  const candidates = pool.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    isMustSee: p.isMustSee,
    hasPhoto: p.photos.length > 0,
    categoryName: p.category.name,
  }));
  const withPhoto = pool.filter((p) => p.photos.length > 0);

  // Itinerary
  let itinerary = await prisma.itinerary.findUnique({
    where: { userId_destinationId_kind: { userId, destinationId, kind: "personal" } },
  });
  if (!itinerary) {
    itinerary = await prisma.itinerary.create({ data: { userId, destinationId, kind: "personal" } });
  }
  await prisma.itineraryDay.deleteMany({ where: { itineraryId: itinerary.id } });

  const scheduledDays = scheduleItineraryDays(candidates, answers.tripDays, hotelAnchor);
  let chosenCount = 0;
  for (let dayIdx = 0; dayIdx < answers.tripDays; dayIdx++) {
    const day = await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: dayIdx + 1 } });
    const stops = scheduledDays[dayIdx] ?? [];
    chosenCount += stops.length;
    for (const stop of stops) {
      await prisma.itineraryItem.create({ data: { itineraryDayId: day.id, poiId: stop.poiId, order: stop.order, timeOfDay: stop.timeOfDay } });
    }
  }

  // Budget
  await prisma.tripBudget.upsert({
    where: { userId_destinationId: { userId, destinationId } },
    update: { totalCents: Math.round(answers.dailyBudget * answers.tripDays * 100), tripDays: answers.tripDays },
    create: {
      userId,
      destinationId,
      totalCents: Math.round(answers.dailyBudget * answers.tripDays * 100),
      tripDays: answers.tripDays,
    },
  });

  // Favorites — top photo-bearing picks
  const favoritesPool = withPhoto.slice(0, 6);
  for (const poi of favoritesPool) {
    await prisma.favorite.upsert({
      where: { userId_poiId: { userId, poiId: poi.id } },
      update: {},
      create: { userId, poiId: poi.id },
    });
  }

  return { ok: true, itemCount: chosenCount, favoriteCount: favoritesPool.length };
}

// ---------- Destination trivia (the "חידונים" screen — unrelated to the
// destination-matching quiz above, which shares the word "quiz" in Hebrew) ----------

export async function submitQuizAttempt(destinationId: string, score: number, totalQuestions: number) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.quizAttempt.create({
    data: { userId: session.user.id, destinationId, score, totalQuestions },
  });
}
