import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { FavoritesGrid } from "./FavoritesGrid";
import { InfoStrip, InfoCard } from "@/components/InfoStrip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { getServerT } from "@/lib/i18n/server";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const TIP_CATEGORY_KEYS: Record<string, DictionaryKey> = {
  money: "favorites.tip.money",
  customs: "favorites.tip.customs",
  transport: "favorites.tip.transport",
  visa: "favorites.tip.visa",
  general: "favorites.tip.general",
};

export default async function FavoritesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/favorites`)}`);
    return <UpgradeRequired tier="silver" />;
  }

  const userId = session!.user!.id;
  const t = await getServerT();

  const [favorites, coupons, mustSee, tips] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId, poi: { category: { area: { destinationId: destination.id } } } },
      include: { poi: { include: { category: { include: { area: true } }, photos: { take: 1 }, tags: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.findMany({ where: { OR: [{ destinationId: destination.id }, { destinationId: null }] } }),
    prisma.pointOfInterest.findMany({
      where: { isMustSee: true, category: { area: { destinationId: destination.id } } },
      select: { id: true, name: true, category: { select: { colorHex: true } } },
      take: 8,
    }),
    prisma.destinationTip.findMany({ where: { destinationId: destination.id } }),
  ]);

  const favoritedIds = new Set(favorites.map((f) => f.poiId));

  return (
    <div className="flex flex-col gap-4">
      {mustSee.length > 0 && (
        <section>
          <h2 className="mb-1 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {t("favorites.mustSeeTitle")}
          </h2>
          <p className="mb-2 text-sm opacity-60">
            {t("favorites.mustSeeBodyPrefix")}
            {destination.name}.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {mustSee.map((poi) => (
              <div
                key={poi.id}
                className="flex items-center justify-between gap-1.5 border px-2 py-1.5 text-xs"
                style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", background: "var(--surface)" }}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: poi.category.colorHex }} />
                  <span className="min-w-0 truncate" title={poi.name}>
                    {poi.name}
                  </span>
                </span>
                <span className="shrink-0">
                  <FavoriteButton poiId={poi.id} slug={slug} initialFavorited={favoritedIds.has(poi.id)} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h1 className="mb-4 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("favorites.title")} ({favorites.length})
        </h1>
        {favorites.length === 0 ? (
          <p className="text-sm opacity-60">{t("favorites.empty")}</p>
        ) : (
          <FavoritesGrid
            slug={slug}
            pois={favorites.map((fav) => ({
              id: fav.poi.id,
              name: fav.poi.name,
              areaName: fav.poi.category.area.name,
              categoryName: fav.poi.category.name,
              categoryColor: fav.poi.category.colorHex,
              photoUrl: fav.poi.photos[0]?.url ?? null,
              hours: fav.poi.hours,
              tags: fav.poi.tags.map((t) => t.label),
            }))}
          />
        )}
      </section>

      {tips.length > 0 && (
        <InfoStrip title={t("favorites.importantTips")}>
          {tips.map((tip) => (
            <InfoCard key={tip.id} label={TIP_CATEGORY_KEYS[tip.category] ? t(TIP_CATEGORY_KEYS[tip.category]) : tip.category} body={tip.text} />
          ))}
        </InfoStrip>
      )}

      {coupons.length === 0 ? (
        <section>
          <h2 className="mb-2 text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {t("favorites.discountsAndCoupons")}
          </h2>
          <p className="text-sm opacity-60">{t("favorites.noDiscounts")}</p>
        </section>
      ) : (
        <InfoStrip title={t("favorites.discountsAndCoupons")}>
          {coupons.map((c) => (
            <InfoCard
              key={c.id}
              title={`🎁 ${c.partnerName}`}
              body={c.discountDesc}
              footer={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {c.code && (
                    <span className="rounded-md px-2 py-0.5 font-mono text-xs" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                      {t("favorites.code")} {c.code}
                    </span>
                  )}
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold underline" style={{ color: "var(--primary)" }}>
                      {t("favorites.detailsAndBenefit")}
                    </a>
                  )}
                </span>
              }
            />
          ))}
        </InfoStrip>
      )}
    </div>
  );
}
