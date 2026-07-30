"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

export async function getVisitedCountryCodes(userId: string): Promise<string[]> {
  const rows = await prisma.visitedCountry.findMany({ where: { userId }, select: { countryCode: true } });
  return rows.map((r) => r.countryCode);
}

/** Global to the user (not tied to one destination), so it revalidates every
 * screen that shows it — the quizzes page for whichever destination is
 * currently open, plus the profile. */
export async function toggleVisitedCountry(countryCode: string, slug?: string) {
  const userId = await requireUserId();
  const existing = await prisma.visitedCountry.findUnique({
    where: { userId_countryCode: { userId, countryCode } },
  });
  if (existing) {
    await prisma.visitedCountry.delete({ where: { id: existing.id } });
  } else {
    await prisma.visitedCountry.create({ data: { userId, countryCode } });
  }
  if (slug) revalidatePath(`/trip/${slug}/quiz`);
  revalidatePath("/account");
}
