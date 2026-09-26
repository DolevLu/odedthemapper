import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { fcmConfigured, sendFcm } from "@/lib/fcm";

/** A short, generic pool for the once-a-week "occasional tip" push (see
 * the notifications cron) — not destination-specific, since there's no
 * per-destination tip content curated anywhere in the app yet; picked
 * deterministically by ISO week number so the same tip doesn't repeat
 * back-to-back for a user checking in around the same time each week. */
export const TRAVEL_TIPS: string[] = [
  "צלמו את הדרכון והכרטיסים לפני הטיסה - עותק בענן חוסך המון אם משהו הולך לאיבוד.",
  "הורידו את המפה של היעד לשימוש אופליין - חוסך גם דאטה נדידה וגם עצבים בלי קליטה.",
  "בדקו את מזג האוויר שבוע לפני הטיסה, לא רק יום לפני - זה משנה מה כדאי לארוז.",
  "השאירו עותק של פרטי הביטוח והכרטיסים אצל מישהו בבית, ליתר ביטחון.",
  "שריינו שולחן במסעדה הפופולרית ביותר ברשימה שלכם כמה ימים מראש.",
  "כדאי לבדוק אם צריך אשרת כניסה או ESTA מראש - זה לוקח דקות אבל עדיף לא ברגע האחרון.",
  "ארגון לפי ימים ולא רק לפי מקומות עושה את הבוקר של הטיול הרבה יותר רגוע.",
  "בדקו את שער החליפין הנוכחי לפני שיוצאים - עוזר לתקצב נכון בלי הפתעות.",
  "תיק גב קטן נוסף לטיולים בתוך היעד - לא צריך לגרור את כל המזוודה כל יום.",
  "אם יש לכם רכב שכור - בדקו חוקי חניה מקומיים מראש, זה נושא נפוץ להפתעות לא נעימות.",
];

export function tipForThisWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return TRAVEL_TIPS[weekNumber % TRAVEL_TIPS.length];
}

let configured = false;
function ensureConfigured(publicKey: string, privateKey: string) {
  if (configured) return;
  webpush.setVapidDetails("mailto:support@odedthemapper.com", publicKey, privateKey);
  configured = true;
}

/** Sends a push notification to every device this user has: web-push subscriptions (browsers) and native app
 * tokens (Android, through Firebase Cloud Messaging). Does nothing for a user who switched notifications off in
 * Settings. A silent no-op (never throws) where neither channel is configured in this environment, so a missing env
 * var never breaks whatever server code triggered the notification. Auto-cleans up any subscription/token the push
 * service reports as dead. Returns how many devices it delivered to. */
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationsEnabled: true } });
  if (!user || !user.notificationsEnabled) return 0;

  let delivered = 0;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    ensureConfigured(publicKey, privateKey);
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
          delivered++;
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      })
    );
  }

  if (fcmConfigured()) {
    const tokens = await prisma.deviceToken.findMany({ where: { userId } });
    await Promise.all(
      tokens.map(async (device) => {
        const result = await sendFcm(device.token, payload);
        if (result === "ok") delivered++;
        else if (result === "dead") await prisma.deviceToken.delete({ where: { id: device.id } }).catch(() => {});
      })
    );
  }

  if (delivered > 0) await prisma.user.update({ where: { id: userId }, data: { lastPushAt: new Date() } }).catch(() => {});
  return delivered;
}
