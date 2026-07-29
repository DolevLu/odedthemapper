import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { PackingChecklist } from "./PackingChecklist";

export default async function PackingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const userId = session!.user!.id;

  const [checks, coupons] = await Promise.all([
    prisma.packingCheck.findMany({ where: { userId, destinationId: destination.id } }),
    prisma.coupon.findMany({ where: { destinationId: null } }),
  ]);

  const checkedKeys = new Set(checks.filter((c) => c.checked).map((c) => c.itemKey));
  const couponsByPartner = Object.fromEntries(
    coupons.map((c) => [c.partnerName, { discountDesc: c.discountDesc, url: c.url }])
  );

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold">🧳 רשימת ציוד וצ׳ק ליסט לפני טיסה</h1>
      <p className="mb-6 text-sm opacity-60">מסך חינמי — זמין לכל משתמש, בכל יעד.</p>
      <PackingChecklist
        destinationId={destination.id}
        slug={slug}
        checkedKeys={checkedKeys}
        couponsByPartner={couponsByPartner}
      />
    </div>
  );
}
