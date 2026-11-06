import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { paymentProvider } from "@/lib/payments";
import { hasAccessToDestination } from "@/lib/access";
import { COUNTRY_FOREVER, COUNTRY_PRICE_CENTS, PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** One-time ₪49 purchase of a single country. Reached from the landing page / the country gate (always a plain <a>,
 * never a prefetched <Link>, because opening this page creates the pending order). Not signed in -> sign up / log in
 * first and come straight back here; already owns the country -> straight into the platform; otherwise a pending
 * order is created (or the user's existing pending one reused) and they continue to the payment page. After paying
 * the payment pages send them to /trip/<slug> with their account. */
export default async function BuyCountryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await prisma.destination.findUnique({ where: { slug } });
  if (!destination || destination.status === "draft" || !destination.isPublic) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/register?callbackUrl=${encodeURIComponent(`/buy/${slug}`)}`);
  const userId = session.user.id;

  if (await hasAccessToDestination(userId, destination.id)) redirect(`/trip/${slug}`);

  const existing = await prisma.subscription.findFirst({
    where: { userId, planKey: "country", status: "pending", destinations: { some: { destinationId: destination.id } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const subscriptionId =
    existing?.id ??
    (
      await prisma.subscription.create({
        data: {
          userId,
          planKey: "country",
          billingCycle: "annual", // unused for one-time purchases; kept only to satisfy the column
          status: "pending",
          paymentSessionId: `${process.env.PAYME_API_KEY ? "pay" : "mock"}_${crypto.randomUUID()}`,
          amountCents: COUNTRY_PRICE_CENTS,
          currency: "ILS",
          currentPeriodEnd: COUNTRY_FOREVER,
          destinations: { create: [{ destinationId: destination.id }] },
        },
        select: { id: true },
      })
    ).id;

  const checkoutUrl = await paymentProvider.createCheckoutUrl({
    subscriptionId,
    planName: `${PLANS.country.name} - ${destination.name}`,
    amountCents: COUNTRY_PRICE_CENTS,
    currency: "ILS",
  });
  redirect(checkoutUrl);
}
