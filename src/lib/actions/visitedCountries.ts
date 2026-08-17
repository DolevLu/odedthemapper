"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";
import { COUNTRY_CODE_BY_SLUG } from "@/lib/countryFlags";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

export async function getVisitedCountryCodes(userId: string): Promise<string[]> {
  const rows = await prisma.visitedCountry.findMany({ where: { userId }, select: { countryCode: true } });
  return rows.map((r) => r.countryCode);
}

export type CountryPhoto = { id: string; url: string };

/** Merges manually-uploaded country photos with Album photos from any
 * destination that maps to the same country — read-time merge (no copying
 * into CountryPhoto) so a destination's Album stays the single source of
 * truth for those photos while still "showing up automatically" here. */
export async function getCountryPhotos(userId: string): Promise<Record<string, CountryPhoto[]>> {
  const bySlug = Object.entries(COUNTRY_CODE_BY_SLUG);
  const [manual, albumMedia] = await Promise.all([
    prisma.countryPhoto.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    bySlug.length > 0
      ? prisma.albumMedia.findMany({
          where: { userId, type: "photo", destination: { slug: { in: bySlug.map(([slug]) => slug) } } },
          include: { destination: { select: { slug: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const result: Record<string, CountryPhoto[]> = {};
  for (const p of manual) {
    (result[p.countryCode] ??= []).push({ id: p.id, url: p.url });
  }
  for (const m of albumMedia) {
    const code = COUNTRY_CODE_BY_SLUG[m.destination.slug];
    if (!code) continue;
    (result[code] ??= []).push({ id: `album-${m.id}`, url: m.url });
  }
  return result;
}

export async function uploadCountryPhoto(countryCode: string, formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return;
  const url = await saveUploadedFile(file, "country-photos");
  if (!url) return;
  await prisma.countryPhoto.create({ data: { userId, countryCode, url } });
  revalidatePath("/account");
}

export async function deleteCountryPhoto(id: string) {
  const userId = await requireUserId();
  await prisma.countryPhoto.deleteMany({ where: { id, userId } });
  revalidatePath("/account");
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
