import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { PoiCard } from "@/components/PoiCard";

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

  const [favorites, coupons, mustSee] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId, poi: { category: { area: { destinationId: destination.id } } } },
      include: { poi: { include: { category: { include: { area: true } }, photos: { take: 1 }, tags: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.findMany({ where: { OR: [{ destinationId: destination.id }, { destinationId: null }] } }),
    prisma.pointOfInterest.findMany({
      where: { isMustSee: true, category: { area: { destinationId: destination.id } } },
      include: { category: { include: { area: true } }, photos: { take: 1 }, tags: true },
      take: 8,
    }),
  ]);

  const favoritedIds = new Set(favorites.map((f) => f.poiId));

  return (
    <div className="flex flex-col gap-4">
      {mustSee.length > 0 && (
        <section>
          <h2 className="mb-1 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            ⭐ המומלצים שלנו - אסור לפספס
          </h2>
          <p className="mb-4 text-sm opacity-60">האתרים והאטרקציות הידועים והאהובים ביותר ב{destination.name}.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {mustSee.map((poi) => (
              <PoiCard
                key={poi.id}
                poi={{
                  id: poi.id,
                  name: poi.name,
                  areaName: poi.category.area.name,
                  categoryName: poi.category.name,
                  categoryColor: poi.category.colorHex,
                  photoUrl: poi.photos[0]?.url ?? null,
                  hours: poi.hours,
                  tags: poi.tags.map((t) => t.label),
                }}
                slug={slug}
                favorited={favoritedIds.has(poi.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h1 className="mb-4 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          ❤️ מועדפים ({favorites.length})
        </h1>
        {favorites.length === 0 ? (
          <p className="text-sm opacity-60">עדיין לא שמרתם נקודות מועדפות. סמנו נקודות במפה כדי לראות אותן כאן.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {favorites.map((fav) => (
              <PoiCard
                key={fav.id}
                poi={{
                  id: fav.poi.id,
                  name: fav.poi.name,
                  areaName: fav.poi.category.area.name,
                  categoryName: fav.poi.category.name,
                  categoryColor: fav.poi.category.colorHex,
                  photoUrl: fav.poi.photos[0]?.url ?? null,
                  hours: fav.poi.hours,
                  tags: fav.poi.tags.map((t) => t.label),
                }}
                slug={slug}
                favorited
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          🎁 הנחות וקופונים
        </h2>
        {coupons.length === 0 ? (
          <p className="text-sm opacity-60">אין עדיין הנחות ליעד הזה.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="game-pop-in group flex flex-col gap-0.5 border px-2.5 py-1.5 text-xs transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-[-0.5deg]"
                style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
              >
                <h3 className="font-semibold">🎁 {c.partnerName}</h3>
                <p className="opacity-70">{c.discountDesc}</p>
                {c.code && <p className="font-mono">קוד: {c.code}</p>}
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline transition-transform duration-200 group-hover:translate-x-[-2px]"
                    style={{ color: "var(--primary)" }}
                  >
                    לפרטים והטבה ←
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
