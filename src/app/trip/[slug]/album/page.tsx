import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { AlbumScreen } from "./AlbumScreen";

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/trip/${slug}/album`);

  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const [media, curatedPhotos, albumSettings, itineraryDayCount] = await Promise.all([
    prisma.albumMedia.findMany({
      where: { userId: session.user.id, destinationId: destination.id },
      orderBy: { createdAt: "desc" },
    }),
    // Capped to 6 — these are just a taste of the destination's photos, not
    // meant to dominate a traveler's own digital album.
    prisma.poiPhoto.findMany({
      where: { poi: { category: { area: { destinationId: destination.id } } } },
      include: { poi: true },
      take: 6,
    }),
    prisma.albumSettings.findUnique({
      where: { userId_destinationId: { userId: session.user.id, destinationId: destination.id } },
    }),
    prisma.itineraryDay.count({
      where: { itinerary: { userId: session.user.id, destinationId: destination.id, kind: "personal" } },
    }),
  ]);

  return (
    <AlbumScreen
      slug={slug}
      destinationId={destination.id}
      destinationName={destination.name}
      theme={destination.theme}
      media={media.map((m) => ({
        id: m.id,
        type: m.type as "photo" | "video",
        url: m.url,
        createdAt: m.createdAt.toISOString(),
        dayIndex: m.dayIndex,
      }))}
      curatedPhotos={curatedPhotos.map((p) => ({ id: p.id, url: p.url, caption: p.poi.name }))}
      tripDayCount={itineraryDayCount}
      initialSettings={{
        templateKey: albumSettings?.templateKey ?? "polaroid",
        backgroundColor: albumSettings?.backgroundColor ?? null,
        days: albumSettings?.daysJson ? JSON.parse(albumSettings.daysJson) : {},
      }}
    />
  );
}
