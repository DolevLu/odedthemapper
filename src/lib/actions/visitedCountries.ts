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

// A transient Supabase pooler drop (P1001/P1017/connection-pool timeout) has
// been the recurring cause of otherwise-inexplicable one-off failures on
// Prisma writes throughout this app's build — retry the DB write itself
// before giving up, same as the admin content scripts do for exactly this.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
  throw new Error("unreachable");
}

/** Open to every logged-in user for any country in the world — not gated by
 * having a paid subscription to a matching destination, since this is just
 * a personal travel scrapbook, not destination content. Uploading photos
 * also marks that country visited (if it wasn't already), since adding a
 * photo from a place implies you were there — one less manual step.
 *
 * Accepts several files at once (formData.getAll, not .get) and never
 * throws on a real failure — every earlier version of this returned void
 * and let any exception (a transient DB blip, an upload failure) propagate
 * unhandled all the way to the client's startTransition callback, which is
 * exactly the kind of unhandled rejection that crashes the whole React tree
 * into the nearest error boundary instead of just failing this one upload. */
export async function uploadCountryPhoto(
  countryCode: string,
  formData: FormData,
  slug?: string
): Promise<{ error?: string }> {
  try {
    const userId = await requireUserId();
    const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return {};

    const urls = (await Promise.all(files.map((f) => saveUploadedFile(f, "country-photos")))).filter(
      (u): u is string => Boolean(u)
    );
    if (urls.length === 0) return { error: "העלאת התמונות נכשלה — נסו שוב" };

    await withRetry(() =>
      Promise.all([
        prisma.countryPhoto.createMany({ data: urls.map((url) => ({ userId, countryCode, url })) }),
        prisma.visitedCountry.upsert({
          where: { userId_countryCode: { userId, countryCode } },
          update: {},
          create: { userId, countryCode },
        }),
      ])
    );
    if (slug) revalidatePath(`/trip/${slug}/quiz`);
    revalidatePath("/account");
    return {};
  } catch (err) {
    console.error("uploadCountryPhoto failed:", err);
    return { error: "משהו השתבש בהעלאה — נסו שוב" };
  }
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
