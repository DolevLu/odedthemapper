import { prisma } from "@/lib/prisma";
import { getGroupContext } from "@/lib/access";

export type ActivityType =
  | "pin_added" | "pin_edited" | "pin_removed" | "pin_voted" | "pins_imported"
  | "item_added" | "item_removed" | "item_time" | "item_moved" | "item_voted" | "day_added" | "day_removed"
  | "plan_shifted";

/** Appends one line to the trip group's change feed - the notification bell
 * reads this. A no-op for anyone without a shared group (nobody else would
 * ever read it), and never throws: a failed log must not fail the edit. */
export async function logGroupActivity(
  userId: string,
  entry: { type: ActivityType; summary: string; destinationId?: string | null; slug?: string | null; entityId?: string | null }
): Promise<void> {
  try {
    const ctx = await getGroupContext(userId);
    if (ctx.size < 2) return;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    const actorName = user?.name?.trim() || user?.email.split("@")[0] || "מישהו";
    await prisma.groupActivity.create({
      data: {
        groupOwnerId: ctx.ownerId,
        actorUserId: userId,
        actorName,
        destinationId: entry.destinationId ?? null,
        slug: entry.slug ?? null,
        type: entry.type,
        summary: entry.summary.slice(0, 200),
        entityId: entry.entityId ?? null,
      },
    });
  } catch (err) {
    console.error("logGroupActivity failed:", err);
  }
}
