"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";
import { parseBook, serializeBook } from "@/lib/albumBook";

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
    if (!url) continue;
    await prisma.albumMedia.create({ data: { userId, destinationId, type, url } });
  }

  revalidatePath(`/trip/${slug}/album`);
}

/** Records an AlbumMedia row for a file already uploaded straight from the
 * browser to Blob storage (see AlbumUploadForm + /api/album/upload) — the
 * file bytes never pass through this action's own request body, only the
 * resulting URL does, which is what actually lets a real phone photo/video
 * upload succeed instead of hitting Vercel's platform-level serverless
 * function payload limit (see uploads.ts's own comment on the old path). */
export async function recordAlbumMedia(destinationId: string, slug: string, type: "photo" | "video", url: string) {
  const userId = await requireUserId();
  await prisma.albumMedia.create({ data: { userId, destinationId, type, url } });
  revalidatePath(`/trip/${slug}/album`);
}

export async function deleteAlbumMedia(mediaId: string, slug: string) {
  const userId = await requireUserId();
  const media = await prisma.albumMedia.findUnique({ where: { id: mediaId } });
  if (!media || media.userId !== userId) return;
  await prisma.albumMedia.delete({ where: { id: mediaId } });
  revalidatePath(`/trip/${slug}/album`);
}

/** Assigns an uploaded photo/video to a trip day, so the digital album can
 * group media day-by-day instead of one flat grid. */
export async function setAlbumMediaDay(mediaId: string, slug: string, dayIndex: number | null) {
  const userId = await requireUserId();
  const media = await prisma.albumMedia.findUnique({ where: { id: mediaId } });
  if (!media || media.userId !== userId) return;
  await prisma.albumMedia.update({ where: { id: mediaId }, data: { dayIndex } });
  revalidatePath(`/trip/${slug}/album`);
}

export type AlbumDaysConfig = Record<string, { title?: string; subtitle?: string }>;

export async function saveAlbumSettings(
  destinationId: string,
  slug: string,
  settings: { templateKey: string; backgroundColor: string | null; days: AlbumDaysConfig }
) {
  const userId = await requireUserId();
  await prisma.albumSettings.upsert({
    where: { userId_destinationId: { userId, destinationId } },
    update: { templateKey: settings.templateKey, backgroundColor: settings.backgroundColor, daysJson: JSON.stringify(settings.days) },
    create: {
      userId,
      destinationId,
      templateKey: settings.templateKey,
      backgroundColor: settings.backgroundColor,
      daysJson: JSON.stringify(settings.days),
    },
  });
  revalidatePath(`/trip/${slug}/album`);
}

/** Saves the interactive album book. The JSON comes from the browser, so it is
 * re-parsed and re-serialised through parseBook (layouts/frames whitelisted,
 * URLs http(s) or same-origin only, text length-capped) before it is stored. */
export async function saveAlbumBook(destinationId: string, slug: string, bookJson: string) {
  const userId = await requireUserId();
  if (bookJson.length > 200_000) throw new Error("האלבום גדול מדי");
  const book = parseBook(bookJson);
  if (!book) throw new Error("האלבום לא תקין");
  const value = serializeBook(book);
  await prisma.albumSettings.upsert({
    where: { userId_destinationId: { userId, destinationId } },
    update: { bookJson: value },
    create: { userId, destinationId, bookJson: value },
  });
  revalidatePath(`/trip/${slug}/album`);
}

/** Generates (if needed) a share token for the printable album page, reused
 * by the "export as PDF" button — same browser-print pattern as the
 * itinerary's PDF export, no server-side PDF library involved. */
export async function ensureAlbumShareToken(destinationId: string, slug: string): Promise<string> {
  const userId = await requireUserId();
  const settings = await prisma.albumSettings.upsert({
    where: { userId_destinationId: { userId, destinationId } },
    update: {},
    create: { userId, destinationId },
  });
  const token = settings.shareToken ?? crypto.randomUUID();
  if (!settings.shareToken) {
    await prisma.albumSettings.update({ where: { id: settings.id }, data: { shareToken: token } });
  }
  revalidatePath(`/trip/${slug}/album`);
  return token;
}
