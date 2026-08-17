import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function ensureConfigured(publicKey: string, privateKey: string) {
  if (configured) return;
  webpush.setVapidDetails("mailto:support@odedthemapper.com", publicKey, privateKey);
  configured = true;
}

/** Sends a push notification to every device this user has granted
 * notification permission on. A silent no-op (never throws) if VAPID keys
 * aren't configured in this environment, so a missing env var never breaks
 * whatever server code triggered the notification. Auto-cleans up any
 * subscription the browser has since revoked (404/410 from the push
 * service — the standard signal a subscription is dead). */
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  ensureConfigured(publicKey, privateKey);

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
