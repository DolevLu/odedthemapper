import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: tsx scripts/make-admin.ts <email>");

  const user = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: { email, isAdmin: true, name: email.split("@")[0] },
  });
  console.log(`${user.email} is now an admin (id: ${user.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
