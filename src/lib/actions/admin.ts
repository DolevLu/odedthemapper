"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { importKmlToDestination } from "@/lib/kml/importToDb";
import { canManageContent } from "@/lib/access";
import { getPhrasebookSeedForSlug } from "@/lib/phrasebookSeeds";

async function requireContentManager() {
  const session = await auth();
  if (!session?.user?.id || !(await canManageContent(session.user.id))) {
    throw new Error("אין הרשאה לניהול תוכן");
  }
}

/** Deletes all imported content (areas/categories/POIs cascade) and the KML
 * import history for a destination, without touching the destination record
 * itself. Used both standalone and as the first step of a KML replace. */
export async function deleteDestinationContent(destinationId: string, slug: string) {
  await requireContentManager();
  await prisma.area.deleteMany({ where: { destinationId } });
  await prisma.kmlImport.deleteMany({ where: { destinationId } });
  revalidateTag(`pois-${destinationId}`, "max");
  revalidateTag("destinations-list", "max");
  revalidatePath(`/admin/destinations/${slug}`);
  revalidatePath(`/trip/${slug}`);
}

/** Uploads + imports a KML, auto-seeds the destination's phrasebook (if empty)
 * from a curated per-language phrase list, and publishes the destination —
 * one action takes a raw KML all the way to a fully working destination.
 * Any previously imported content for this destination is cleared first, so
 * re-uploading a KML always fully replaces the old map rather than duplicating it. */
export async function uploadKml(destinationId: string, slug: string, formData: FormData) {
  await requireContentManager();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const xml = await file.text();
  await prisma.area.deleteMany({ where: { destinationId } });
  await prisma.kmlImport.deleteMany({ where: { destinationId } });
  await importKmlToDestination(prisma, destinationId, file.name, xml);

  const existingPhrasebookCount = await prisma.phrasebookEntry.count({ where: { destinationId } });
  if (existingPhrasebookCount === 0) {
    const seed = getPhrasebookSeedForSlug(slug);
    if (seed.length > 0) {
      await prisma.phrasebookEntry.createMany({
        data: seed.map((p) => ({ destinationId, ...p })),
      });
    }
  }

  const destination = await prisma.destination.findUniqueOrThrow({ where: { id: destinationId } });
  if (destination.status === "draft") {
    await prisma.destination.update({ where: { id: destinationId }, data: { status: "preview" } });
  }

  revalidateTag(`pois-${destinationId}`, "max");
  revalidateTag("destinations-list", "max");
  revalidatePath(`/admin/destinations/${slug}`);
  revalidatePath("/");
  revalidatePath(`/trip/${slug}`);
}

export async function updateDestinationMeta(destinationId: string, slug: string, formData: FormData) {
  await requireContentManager();
  const status = String(formData.get("status") ?? "draft");
  const tagline = String(formData.get("tagline") ?? "") || null;

  await prisma.destination.update({
    where: { id: destinationId },
    data: { status, tagline },
  });
  revalidateTag("destinations-list", "max");
  revalidatePath(`/admin/destinations/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function addCoupon(destinationId: string, slug: string, formData: FormData) {
  await requireContentManager();
  const partnerName = String(formData.get("partnerName") ?? "");
  const discountDesc = String(formData.get("discountDesc") ?? "");
  const code = String(formData.get("code") ?? "") || null;
  const url = String(formData.get("url") ?? "") || null;
  if (!partnerName || !discountDesc) return;

  await prisma.coupon.create({ data: { destinationId, partnerName, discountDesc, code, url } });
  revalidatePath(`/admin/destinations/${slug}`);
}

export async function deleteCoupon(couponId: string, slug: string) {
  await requireContentManager();
  await prisma.coupon.delete({ where: { id: couponId } });
  revalidatePath(`/admin/destinations/${slug}`);
}

export async function addPhrasebookEntry(destinationId: string, slug: string, formData: FormData) {
  await requireContentManager();
  const localPhrase = String(formData.get("localPhrase") ?? "");
  const translation = String(formData.get("translation") ?? "");
  const pronunciation = String(formData.get("pronunciation") ?? "") || null;
  if (!localPhrase || !translation) return;

  await prisma.phrasebookEntry.create({ data: { destinationId, localPhrase, translation, pronunciation } });
  revalidatePath(`/admin/destinations/${slug}`);
}

export async function deletePhrasebookEntry(entryId: string, slug: string) {
  await requireContentManager();
  await prisma.phrasebookEntry.delete({ where: { id: entryId } });
  revalidatePath(`/admin/destinations/${slug}`);
}
