import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { PackingChecklist } from "./PackingChecklist";
import { BookingChecklist } from "./BookingChecklist";

export default async function PackingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const [checks, coupons, bookablePois] = await Promise.all([
    userId ? prisma.packingCheck.findMany({ where: { userId, destinationId: destination.id } }) : Promise.resolve([]),
    prisma.coupon.findMany({ where: { destinationId: null } }),
    prisma.pointOfInterest.findMany({
      where: { wantsBooking: true, category: { area: { destinationId: destination.id } } },
      select: { id: true, name: true },
    }),
  ]);

  const checkedKeys = new Set(checks.filter((c) => c.checked).map((c) => c.itemKey));
  const couponsByPartner = Object.fromEntries(
    coupons.map((c) => [c.partnerName, { discountDesc: c.discountDesc, url: c.url }])
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-2 text-xl font-bold">🧳 רשימת ציוד וצ׳ק ליסט לפני טיסה</h1>
        <p className="text-sm opacity-60">מסך חינמי — זמין לכל משתמש, בכל יעד.</p>
      </div>
      <BookingChecklist destinationId={destination.id} slug={slug} items={bookablePois} checkedKeys={checkedKeys} />
      <PackingChecklist
        destinationId={destination.id}
        slug={slug}
        checkedKeys={checkedKeys}
        couponsByPartner={couponsByPartner}
      />
    </div>
  );
}
