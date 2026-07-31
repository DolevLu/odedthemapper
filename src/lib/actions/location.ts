"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

export async function recordLocationPing(destinationId: string, lat: number, lng: number) {
  const userId = await requireUserId();
  await prisma.locationPing.create({ data: { userId, destinationId, lat, lng } });
}

export async function getLocationTrail(destinationId: string) {
  const userId = await requireUserId();
  const pings = await prisma.locationPing.findMany({
    where: { userId, destinationId },
    orderBy: { recordedAt: "asc" },
    select: { lat: true, lng: true },
  });
  return pings;
}
