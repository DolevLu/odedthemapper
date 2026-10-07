/* One-off (2026-10-07): the free tier changed from "forever" to ONE FREE WEEK. Existing accounts get a fresh 7-day
 * window starting now (a grace period - they signed up under the old "free forever" offer), and every existing
 * "free" subscription is ended at that same moment. Admins and accounts with an active paid plan are untouched.
 *   node scripts/migrate-free-week.cjs --dry    # report only
 *   node scripts/migrate-free-week.cjs          # write
 */
const { PrismaClient } = require("@prisma/client");
const DRY = process.argv.includes("--dry");
(async () => {
  const p = new PrismaClient();
  try {
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const users = await p.user.findMany({ where: { isAdmin: false, freeUntil: null }, select: { id: true, email: true } });
    console.log(`${DRY ? "[dry] " : ""}users to get a free week until ${until.toISOString()}: ${users.length}`);
    if (!DRY) await p.user.updateMany({ where: { id: { in: users.map((u) => u.id) } }, data: { freeUntil: until } });
    const free = await p.subscription.findMany({ where: { planKey: "free", status: "active" }, select: { id: true } });
    console.log(`${DRY ? "[dry] " : ""}free subscriptions to end at the same time: ${free.length}`);
    if (!DRY) await p.subscription.updateMany({ where: { id: { in: free.map((s) => s.id) } }, data: { currentPeriodEnd: until } });
  } finally {
    await p.$disconnect();
  }
})();
