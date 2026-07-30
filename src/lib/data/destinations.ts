import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { ThemeConfig } from "@/lib/theme/types";

export type DestinationSummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: string;
  priceCents: number;
  currency: string;
  heroImage: string | null;
  heroPhotos: string[];
  theme: ThemeConfig;
  poiCount: number;
  areaCount: number;
  continent: string;
  isBestSeller: boolean;
};

async function getHeroPhotos(destinationId: string, take = 6): Promise<string[]> {
  const attractionPhotos = await prisma.poiPhoto.findMany({
    where: {
      poi: {
        category: {
          name: { contains: "אטרקצי" },
          area: { destinationId },
        },
      },
    },
    take,
    distinct: ["poiId"],
  });
  if (attractionPhotos.length >= 3) return attractionPhotos.map((p) => p.url);

  const anyPhotos = await prisma.poiPhoto.findMany({
    where: { poi: { category: { area: { destinationId } } } },
    take,
    distinct: ["poiId"],
  });
  return anyPhotos.map((p) => p.url);
}

export async function getAllDestinations(): Promise<DestinationSummary[]> {
  const destinations = await prisma.destination.findMany({
    orderBy: { name: "asc" },
    include: {
      areas: {
        include: { categories: { include: { _count: { select: { pois: true } } } } },
      },
    },
  });

  return Promise.all(
    destinations.map(async (d) => {
      const poiCount = d.areas.reduce(
        (sum, area) => sum + area.categories.reduce((s, c) => s + c._count.pois, 0),
        0
      );
      const heroPhotos = !d.heroImage && poiCount > 0 ? await getHeroPhotos(d.id) : [];
      return {
        id: d.id,
        slug: d.slug,
        name: d.name,
        tagline: d.tagline,
        status: d.status,
        priceCents: d.priceCents,
        currency: d.currency,
        heroImage: d.heroImage ?? heroPhotos[0] ?? null,
        heroPhotos,
        theme: JSON.parse(d.themeConfig) as ThemeConfig,
        poiCount,
        areaCount: d.areas.length,
        continent: d.continent,
        isBestSeller: d.isBestSeller,
      };
    })
  );
}

/** Lightweight destination lookup used by every /trip/[slug]/* route (layout
 * + each screen) purely for id/name/theme/access-checking. Deliberately does
 * NOT fetch areas/categories/POIs — those are thousands of rows per
 * destination and no caller here ever reads them (each screen that needs POI
 * data fetches it itself via getFlatPoisForDestination or a scoped query). */
export const getDestinationBySlug = cache(async (slug: string) => {
  const destination = await prisma.destination.findUnique({ where: { slug } });
  if (!destination) return null;

  return {
    ...destination,
    theme: JSON.parse(destination.themeConfig) as ThemeConfig,
  };
});
