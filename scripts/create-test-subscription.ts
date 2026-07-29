import { prisma } from "../src/lib/prisma";

async function main() {
  const email = "oded.the.mapper@gmail.com";
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      planKey: "solo",
      billingCycle: "monthly",
      status: "pending",
      paymentSessionId: `payme_test_${crypto.randomUUID()}`,
      amountCents: 100, // $1 test charge
      currency: "USD",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`Created test subscription: ${subscription.id}`);
  console.log(`Checkout URL: http://localhost:3000/subscribe/payme/${subscription.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
