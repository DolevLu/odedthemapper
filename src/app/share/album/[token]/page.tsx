import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ThemeConfig } from "@/lib/theme/types";
import { DigitalAlbumView } from "@/app/trip/[slug]/album/DigitalAlbumView";
import { PrintButton } from "../../itinerary/[token]/PrintButton";

export default async function SharedAlbumPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const settings = await prisma.albumSettings.findUnique({
    where: { shareToken: token },
    include: { destination: true },
  });
  if (!settings) notFound();

  const [media, curatedPhotos] = await Promise.all([
    prisma.albumMedia.findMany({
      where: { userId: settings.userId, destinationId: settings.destinationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.poiPhoto.findMany({
      where: { poi: { category: { area: { destinationId: settings.destinationId } } } },
      include: { poi: true },
      take: 6,
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 print:py-4">
      <div className="flex items-center justify-between gap-3 border-b pb-4 print:hidden" style={{ borderColor: "#1A1A1A22" }}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="עודד המנקד" className="h-10 w-10" />
          <div>
            <p className="text-xs font-bold tracking-wide opacity-70">עודד המנקד</p>
            <p className="text-sm opacity-60">אלבום טיול - תצוגת אורח</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <DigitalAlbumView
        destinationName={settings.destination.name}
        theme={JSON.parse(settings.destination.themeConfig) as ThemeConfig}
        media={media.map((m) => ({ id: m.id, type: m.type as "photo" | "video", url: m.url, createdAt: m.createdAt.toISOString(), dayIndex: m.dayIndex }))}
        curatedPhotos={curatedPhotos.map((p) => ({ id: p.id, url: p.url, caption: p.poi.name }))}
        settings={{
          templateKey: settings.templateKey,
          backgroundColor: settings.backgroundColor,
          days: settings.daysJson ? JSON.parse(settings.daysJson) : {},
        }}
      />
    </div>
  );
}
