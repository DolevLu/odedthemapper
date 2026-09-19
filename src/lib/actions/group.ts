"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getGroupContext } from "@/lib/access";
import { requireSessionUserId } from "@/lib/groupAccess";
import { logGroupActivity } from "@/lib/groupActivity";

export type FeedItem = {
  id: string;
  actorName: string;
  summary: string;
  type: string;
  slug: string | null;
  createdAt: string;
  mine: boolean;
  unread: boolean;
};

export type GroupFeed = { shared: boolean; unread: number; items: FeedItem[]; members: number };

/** The notification bell's data: the last 30 changes anyone in the trip group
 * made, and how many of those (by other people) happened since this user last
 * opened the bell. `shared` is false for anyone without a shared plan, so the
 * bell can stay hidden for them. */
export async function getGroupFeed(): Promise<GroupFeed> {
  const userId = await requireSessionUserId();
  const ctx = await getGroupContext(userId);
  if (ctx.size < 2) return { shared: false, unread: 0, items: [], members: ctx.size };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { groupActivitySeenAt: true, createdAt: true } });
  const seenAt = user?.groupActivitySeenAt ?? user?.createdAt ?? new Date(0);
  const rows = await prisma.groupActivity.findMany({
    where: { groupOwnerId: ctx.ownerId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const items: FeedItem[] = rows.map((r) => ({
    id: r.id,
    actorName: r.actorName,
    summary: r.summary,
    type: r.type,
    slug: r.slug,
    createdAt: r.createdAt.toISOString(),
    mine: r.actorUserId === userId,
    unread: r.actorUserId !== userId && r.createdAt > seenAt,
  }));
  return { shared: true, unread: items.filter((i) => i.unread).length, items, members: ctx.size };
}

export async function markGroupFeedSeen(): Promise<void> {
  const userId = await requireSessionUserId();
  await prisma.user.update({ where: { id: userId }, data: { groupActivitySeenAt: new Date() } });
}

/** Like/dislike a shared saved pin - one vote per member, clicking the same
 * value again clears it (same behavior as itinerary stop votes). */
export async function voteSavedMapPin(pinId: string, value: 1 | -1, slug: string): Promise<void> {
  const userId = await requireSessionUserId();
  const { userIds } = await getGroupContext(userId);
  const pin = await prisma.savedMapPin.findFirst({
    where: { id: pinId, userId: { in: userIds } },
    select: { name: true, destinationId: true },
  });
  if (!pin) throw new Error("הנקודה לא נמצאה");

  const existing = await prisma.savedMapPinVote.findUnique({ where: { pinId_userId: { pinId, userId } } });
  if (existing && existing.value === value) {
    await prisma.savedMapPinVote.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.savedMapPinVote.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.savedMapPinVote.create({ data: { pinId, userId, value } });
  }
  if (!existing || existing.value !== value) {
    await logGroupActivity(userId, {
      type: "pin_voted",
      summary: `${value === 1 ? "הצביע/ה בעד" : "הצביע/ה נגד"} “${pin.name}” במפה`,
      destinationId: pin.destinationId,
      slug,
      entityId: pinId,
    });
  }
  revalidatePath(`/trip/${slug}`);
}
