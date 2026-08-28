"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

/** Sets (or clears, if rating is null) this user's personal 1-5 rating +
 * optional note for a place — their own content, kept forever regardless of
 * subscription status (see PoiRating in schema.prisma). Upserts rather than
 * create/update-branching since a user can re-rate a place they already
 * rated. slug is only used to revalidate the screens that show ratings. */
export async function ratePoi(poiId: string, slug: string, rating: number | null, note?: string) {
  const userId = await requireUserId();

  if (rating === null) {
    await prisma.poiRating.deleteMany({ where: { userId, poiId } });
  } else {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("דירוג לא תקין");
    }
    await prisma.poiRating.upsert({
      where: { userId_poiId: { userId, poiId } },
      update: { rating, note: note?.trim() || null },
      create: { userId, poiId, rating, note: note?.trim() || null },
    });
  }

  revalidatePath(`/trip/${slug}`);
  revalidatePath(`/trip/${slug}/map`);
  revalidatePath("/trips");
}
