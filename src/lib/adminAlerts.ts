import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

/** Pushes a notification to every admin account (isAdmin: true) via the existing web-push/FCM infra (lib/push.ts)
 * - no email involved, per explicit instruction (the project has no email-sending infra at all, and standing up
 * one wasn't wanted). Fire-and-forget: never throws, so a notification failure (push not configured, a dead
 * subscription, etc.) never breaks whatever real action triggered it - new account, new purchase, new feedback. */
export async function notifyAdmins(payload: { title: string; body: string; url?: string }): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
    await Promise.all(admins.map((a) => sendPushToUser(a.id, payload).catch(() => {})));
  } catch {
    // Never let an admin-alert failure break the real action that triggered it.
  }
}
