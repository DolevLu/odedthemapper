"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

export async function uploadAlbumMedia(destinationId: string, slug: string, formData: FormData) {
  const userId = await requireUserId();
  const files = formData.getAll("files") as File[];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const type = file.type.startsWith("video/") ? "video" : "photo";
    const url = await saveUploadedFile(file, "album");
    await prisma.albumMedia.create({ data: { userId, destinationId, type, url } });
  }

  revalidatePath(`/trip/${slug}/album`);
}

export async function deleteAlbumMedia(mediaId: string, slug: string) {
  const userId = await requireUserId();
  const media = await prisma.albumMedia.findUnique({ where: { id: mediaId } });
  if (!media || media.userId !== userId) return;
  await prisma.albumMedia.delete({ where: { id: mediaId } });
  revalidatePath(`/trip/${slug}/album`);
}
