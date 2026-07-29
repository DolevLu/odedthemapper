"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAccessToDestination } from "@/lib/access";
import { optimizeAcrossDays } from "@/lib/routeOptimizer";
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
  const perDay = 5;
  const pool = await prisma.pointOfInterest.findMany({
    where: {
      geometryType: "point",
      category: {
        area: { destinationId },
        OR: keywords.length > 0 ? keywords.map((k) => ({ name: { contains: k } })) : undefined,
      },
    },
    include: { photos: { take: 1 } },
    take: answers.tripDays * perDay * 2,
  });

  if (pool.length === 0) return { ok: false, error: "לא נמצאו מספיק נקודות מתאימות ליעד הזה" };

  const withPhoto = pool.filter((p) => p.photos.length > 0);
  const chosen = (withPhoto.length >= answers.tripDays * perDay ? withPhoto : pool).slice(0, answers.tripDays * perDay);

  // Itinerary
  let itinerary = await prisma.itinerary.findUnique({
    where: { userId_destinationId_kind: { userId, destinationId, kind: "personal" } },
  });
  if (!itinerary) {
    itinerary = await prisma.itinerary.create({ data: { userId, destinationId, kind: "personal" } });
  }
  await prisma.itineraryDay.deleteMany({ where: { itineraryId: itinerary.id } });

  const grouped = optimizeAcrossDays(
    chosen.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    answers.tripDays
  );
  for (let dayIdx = 0; dayIdx < answers.tripDays; dayIdx++) {
    const day = await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: dayIdx + 1 } });
    const items = grouped[dayIdx] ?? [];
    let minutes = 9 * 60;
    for (let order = 0; order < items.length; order++) {
      const timeOfDay = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      await prisma.itineraryItem.create({ data: { itineraryDayId: day.id, poiId: items[order].id, order, timeOfDay } });
      minutes += 105;
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

  return { ok: true, itemCount: chosen.length, favoriteCount: favoritesPool.length };
}
