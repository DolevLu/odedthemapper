import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { PoiCard } from "@/components/PoiCard";
import { FavoriteButton } from "@/components/FavoriteButton";

const TIP_CATEGORY_LABELS: Record<string, string> = {
  money: "💰 כסף",
  customs: "🤝 נהגים ותרבות",
  transport: "🚌 תחבורה",
  visa: "🛂 ויזה וכניסה",
  general: "ℹ️ כללי",
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
            ⭐ המומלצים שלנו - אסור לפספס
          </h2>
          <p className="mb-2 text-sm opacity-60">האתרים והאטרקציות הידועים והאהובים ביותר ב{destination.name}.</p>
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

      {tips.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            💡 טיפים חשובים לפני הנסיעה
          </h2>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="game-pop-in border px-2.5 py-1.5 text-xs transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-[0.5deg]"
                style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
              >
                <p className="mb-0.5 text-[11px] font-semibold opacity-60">{TIP_CATEGORY_LABELS[tip.category] ?? tip.category}</p>
                <p>{tip.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

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
