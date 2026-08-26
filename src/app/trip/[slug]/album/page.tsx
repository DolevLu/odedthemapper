import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { LoginPromptBanner } from "@/components/LoginPromptBanner";
import { AlbumScreen } from "./AlbumScreen";

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  // Curated photos are the same for every visitor — no reason to hide them
  // behind login, matching every other free screen's "preview, don't block"
  // pattern instead of this one's old hard redirect to /login.
  const [media, curatedPhotos, albumSettings, itineraryDayCount] = await Promise.all([
    userId
      ? prisma.albumMedia.findMany({ where: { userId, destinationId: destination.id }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    // Capped to 6 — these are just a taste of the destination's photos, not
    // meant to dominate a traveler's own digital album.
    prisma.poiPhoto.findMany({
      where: { poi: { category: { area: { destinationId: destination.id } } } },
      include: { poi: true },
      take: 6,
    }),
    userId ? prisma.albumSettings.findUnique({ where: { userId_destinationId: { userId, destinationId: destination.id } } }) : Promise.resolve(null),
    userId
      ? prisma.itineraryDay.count({ where: { itinerary: { userId, destinationId: destination.id, kind: "personal" } } })
      : Promise.resolve(0),
  ]);

  return (
    <>
      {!userId && <LoginPromptBanner slug={slug} path="/album" message="התחברו כדי להעלות ולשמור תמונות משלכם לאלבום" />}
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
    </>
  );
}
