import { prisma } from "@/lib/prisma";

/** Simple, transparent points formula — no hidden weighting: 20 pts per
 * destination ever subscribed to, 10 pts per itinerary actually filled in,
 * 2 pts per packing item checked, 2 pts per quiz-question answered right. */
export async function getUserTravelStats(userId: string) {
  const [subDestinations, documentsCount, itineraries, quizAttempts, packingChecked, user] = await Promise.all([
    prisma.subscriptionDestination.findMany({
      where: { subscription: { userId } },
      select: { destinationId: true },
      distinct: ["destinationId"],
    }),
    prisma.tripLogistic.count({ where: { userId, imageUrl: { not: null } } }),
    prisma.itinerary.findMany({
      where: { userId, kind: "personal" },
      include: { days: { include: { items: true } } },
    }),
    prisma.quizAttempt.findMany({ where: { userId } }),
    prisma.packingCheck.count({ where: { userId, checked: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
  ]);

  const itinerariesWithContent = itineraries.filter((it) => it.days.some((d) => d.items.length > 0));
  const countriesVisited = subDestinations.length;
  const quizPoints = quizAttempts.reduce((sum, a) => sum + a.score * 2, 0);
  const totalPoints = countriesVisited * 20 + itinerariesWithContent.length * 10 + packingChecked * 2 + quizPoints;

  const daysSinceJoined = user ? Math.max(0, Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const bestQuizAveragePct = quizAttempts.length
    ? Math.round((quizAttempts.reduce((s, a) => s + a.score / a.totalQuestions, 0) / quizAttempts.length) * 100)
    : null;

  return {
    countriesVisited,
    documentsCount,
    itinerariesCount: itinerariesWithContent.length,
    quizzesTaken: quizAttempts.length,
    bestQuizAveragePct,
    packingChecked,
    daysSinceJoined,
    totalPoints,
  };
}
