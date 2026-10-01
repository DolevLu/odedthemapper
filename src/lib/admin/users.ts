import { prisma } from "@/lib/prisma";
import { resolvePlan } from "@/lib/plans";

// How recently someone's presence heartbeat (PresenceHeartbeat.tsx, every 45s while a tab is open and visible)
// must have landed for the admin panel to count them as "online now". Wider than the ping interval itself so a
// single missed/delayed ping doesn't flicker someone to offline.
export const ACTIVE_NOW_WINDOW_MS = 3 * 60 * 1000;

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  isAdmin: boolean;
  isOnlineNow: boolean;
  lastSeenAt: Date | null;
  planName: string | null;
  planKey: string | null;
  /** Only set for a user whose active plan is the free tier (one swappable destination) — the one case where
   * "which destination" is a single, meaningful answer; an allDestinations/org plan has no one slot to name. */
  freeDestinationName: string | null;
};

/** Every registered user, newest first, with their account age, live-presence status, and (for the free tier
 * specifically) which single destination they picked - see PresenceHeartbeat.tsx for how lastSeenAt gets kept
 * fresh. */
export async function getAllUsersForAdmin(): Promise<{ users: AdminUserRow[]; activeNowCount: number }> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      isAdmin: true,
      lastSeenAt: true,
      subscriptions: {
        where: { status: "active", currentPeriodEnd: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          planKey: true,
          destinations: { take: 1, select: { destination: { select: { name: true } } } },
        },
      },
    },
  });

  const now = Date.now();
  const rows: AdminUserRow[] = users.map((u) => {
    const sub = u.subscriptions[0];
    const plan = sub ? resolvePlan(sub.planKey) : null;
    const isOnlineNow = Boolean(u.lastSeenAt && now - u.lastSeenAt.getTime() <= ACTIVE_NOW_WINDOW_MS);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      isAdmin: u.isAdmin,
      isOnlineNow,
      lastSeenAt: u.lastSeenAt,
      planName: plan?.name ?? null,
      planKey: sub?.planKey ?? null,
      freeDestinationName: sub?.planKey === "free" ? (sub.destinations[0]?.destination.name ?? null) : null,
    };
  });

  return { users: rows, activeNowCount: rows.filter((r) => r.isOnlineNow).length };
}
