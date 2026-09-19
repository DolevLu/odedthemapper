import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGroupContext } from "@/lib/access";

/** The signed-in user's id, or throws. */
export async function requireSessionUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

/** The itinerary day must belong to an itinerary owned by someone in the
 * caller's trip group (or the caller). Closes the gap where any itinerary
 * mutation could be aimed at an arbitrary id. */
export async function assertDayAccess(userId: string, dayId: string) {
  const { userIds } = await getGroupContext(userId);
  const day = await prisma.itineraryDay.findFirst({
    where: { id: dayId, itinerary: { userId: { in: userIds } } },
    include: { itinerary: { select: { destinationId: true, userId: true } } },
  });
  if (!day) throw new Error("אין הרשאה לעריכת היום הזה");
  return day;
}

export async function assertItemAccess(userId: string, itemId: string) {
  const { userIds } = await getGroupContext(userId);
  const item = await prisma.itineraryItem.findFirst({
    where: { id: itemId, day: { itinerary: { userId: { in: userIds } } } },
    include: { poi: { select: { name: true } }, day: { select: { id: true, dayIndex: true, itinerary: { select: { destinationId: true } } } } },
  });
  if (!item) throw new Error("אין הרשאה לעריכת הנקודה הזו");
  return item;
}

export function itemLabel(item: { customLabel: string | null; poi: { name: string } | null }): string {
  return item.poi?.name ?? item.customLabel ?? "נקודה";
}
