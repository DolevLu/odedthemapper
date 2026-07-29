import { prisma } from "../src/lib/prisma";
async function main() {
  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true, name: true } });
  console.log(admins);
}
main().finally(() => prisma.$disconnect());
