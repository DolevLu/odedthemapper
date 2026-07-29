"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ItineraryKind = "personal" | "client";

export async function enableItineraryShareLink(
  destinationId: string,
  slug: string,
  kind: ItineraryKind = "personal",
  path = "itinerary"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  const userId = session.user.id;

  const itinerary = await prisma.itinerary.upsert({
    where: { userId_destinationId_kind: { userId, destinationId, kind } },
    update: {},
    create: { userId, destinationId, kind },
  });

  if (!itinerary.shareToken) {
    await prisma.itinerary.update({
      where: { id: itinerary.id },
      data: { shareToken: crypto.randomUUID() },
    });
  }
  revalidatePath(`/trip/${slug}/${path}`);
}

/** Same as enableItineraryShareLink but returns the token directly, for flows
 * (like PDF export) that need to open the share URL immediately. */
export async function ensureItineraryShareToken(
  destinationId: string,
  slug: string,
  kind: ItineraryKind = "personal",
  path = "itinerary"
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  const userId = session.user.id;

  const itinerary = await prisma.itinerary.upsert({
    where: { userId_destinationId_kind: { userId, destinationId, kind } },
    update: {},
    create: { userId, destinationId, kind },
  });

  const token = itinerary.shareToken ?? crypto.randomUUID();
  if (!itinerary.shareToken) {
    await prisma.itinerary.update({ where: { id: itinerary.id }, data: { shareToken: token } });
  }
  revalidatePath(`/trip/${slug}/${path}`);
  return token;
}

export async function disableItineraryShareLink(
  destinationId: string,
  slug: string,
  kind: ItineraryKind = "personal",
  path = "itinerary"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  await prisma.itinerary.update({
    where: { userId_destinationId_kind: { userId: session.user.id, destinationId, kind } },
    data: { shareToken: null },
  });
  revalidatePath(`/trip/${slug}/${path}`);
}
