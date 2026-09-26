import { prisma } from "@/lib/prisma";
import { TRAVEL_TIPS } from "@/lib/push";

type Message = { title: string; body: string; url: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayOfYear(now: Date): number {
  return Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / DAY_MS);
}

/** The "at least one push a day" message for one user - something that is true and useful for THEM today, never
 * an empty ping. Candidates are built from what the user actually has; a nearby flight always wins, otherwise the
 * day of the year rotates through what's available so consecutive days don't repeat the same kind of message. */
export async function buildDailyPush(userId: string, now: Date): Promise<Message> {
  const day = dayOfYear(now);
  const candidates: Message[] = [];

  // 1. A trip is coming up (a saved flight) - countdown + a nudge to get ready. Within two weeks it always wins.
  const nextFlight = await prisma.tripLogistic.findFirst({
    where: { userId, type: "flight", startsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    include: { destination: { select: { name: true, slug: true } } },
  });
  if (nextFlight?.startsAt) {
    const daysLeft = Math.max(1, Math.ceil((nextFlight.startsAt.getTime() - now.getTime()) / DAY_MS));
    const message: Message = {
      title: daysLeft <= 1 ? `✈️ מחר טסים ל${nextFlight.destination.name}!` : `✈️ עוד ${daysLeft} ימים ל${nextFlight.destination.name}`,
      body: daysLeft <= 3 ? "עברו על רשימת האריזה והמסמכים - הכול במקום אחד באפליקציה." : "זמן טוב לסדר את המסלול, התקציב והכרטיסים לפני הטיסה.",
      url: `/trip/${nextFlight.destination.slug}/${daysLeft <= 3 ? "packing" : "itinerary"}`,
    };
    if (daysLeft <= 14) return message;
    candidates.push(message);
  }

  // 2. An itinerary that isn't finished - "continue what you started".
  const itineraries = await prisma.itinerary.findMany({
    where: { userId, kind: "personal" },
    include: { destination: { select: { name: true, slug: true } }, days: { select: { items: { select: { id: true } } } } },
    orderBy: { id: "desc" },
    take: 3,
  });
  const unfinished = itineraries.find((it) => it.days.length === 0 || it.days.some((d) => d.items.length < 2));
  if (unfinished) {
    const emptyDays = unfinished.days.filter((d) => d.items.length < 2).length;
    candidates.push({
      title: `🗺️ המשיכו את הטיול ל${unfinished.destination.name}`,
      body: emptyDays > 0 ? `יש ${emptyDays} ${emptyDays === 1 ? "יום" : "ימים"} שעוד חסרה בהם תוכנית. כמה דקות ותסיימו.` : "התחלתם לבנות מסלול - בואו נמשיך מאיפה שעצרתם.",
      url: `/trip/${unfinished.destination.slug}/itinerary`,
    });
  }

  // 3. A recommendation from a destination they opened before: a must-see place they haven't saved yet.
  const accessed = await prisma.destinationAccess.findMany({ where: { userId }, include: { destination: { select: { id: true, name: true, slug: true } } }, take: 10 });
  if (accessed.length > 0) {
    const dest = accessed[day % accessed.length].destination;
    const saved = await prisma.favorite.findMany({ where: { userId }, select: { poiId: true } });
    const mustSee = await prisma.pointOfInterest.findMany({
      where: { isMustSee: true, geometryType: "point", category: { area: { destinationId: dest.id } }, id: { notIn: saved.map((f) => f.poiId) } },
      select: { id: true, name: true },
      take: 30,
    });
    if (mustSee.length > 0) {
      const poi = mustSee[day % mustSee.length];
      candidates.push({ title: `⭐ המלצה ל${dest.name}`, body: `${poi.name} - מהמקומות שהכי כדאי לראות. רוצים לשמור למועדפים?`, url: `/trip/${dest.slug}?focus=${poi.id}` });
    }
  }

  // 4. Always available: a travel tip for the day.
  candidates.push({ title: "💡 טיפ לדרך", body: TRAVEL_TIPS[day % TRAVEL_TIPS.length], url: "/home" });

  return candidates[day % candidates.length];
}
