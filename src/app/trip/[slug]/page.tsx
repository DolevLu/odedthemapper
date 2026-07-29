import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination } from "@/lib/data/pois";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { NowScreen } from "./NowScreen";

export default async function TripHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") return <UpgradeRequired tier="silver" />;

  const [pois, favorites] = await Promise.all([
    getFlatPoisForDestination(destination.id),
    prisma.favorite.findMany({ where: { userId: session!.user!.id }, select: { poiId: true } }),
  ]);
  const categoryNames = Array.from(new Set(pois.map((p) => p.categoryName))).sort();
  const favoritedIds = new Set(favorites.map((f) => f.poiId));

  return <NowScreen pois={pois} categoryNames={categoryNames} slug={slug} favoritedIds={favoritedIds} />;
}
