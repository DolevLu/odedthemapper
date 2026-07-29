import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) throw new Error("Usage: tsx scripts/set-password.ts <email> <password>");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({ where: { email }, data: { passwordHash } });
  console.log(`Password set for ${user.email}`);
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
