import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { toggleFavorite } from "@/lib/actions/trip";
import { UpgradeRequired } from "@/components/UpgradeRequired";

export default async function FavoritesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") return <UpgradeRequired tier="silver" />;

  const userId = session!.user!.id;

  const [favorites, coupons] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId, poi: { category: { area: { destinationId: destination.id } } } },
      include: { poi: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.findMany({ where: { OR: [{ destinationId: destination.id }, { destinationId: null }] } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          ❤️ מועדפים ({favorites.length})
        </h1>
        {favorites.length === 0 ? (
          <p className="text-sm opacity-60">עדיין לא שמרתם נקודות מועדפות. סמנו נקודות במפה כדי לראות אותן כאן.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex flex-col gap-2 border p-4"
                style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: fav.poi.category.colorHex }} />
                  <span className="text-xs opacity-60">{fav.poi.category.name}</span>
                </div>
                <h3 className="font-semibold">{fav.poi.name}</h3>
                <form action={toggleFavorite.bind(null, fav.poiId, slug)}>
                  <button className="text-sm underline opacity-70">הסרה ממועדפים</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          🎁 הנחות וקופונים
        </h2>
        {coupons.length === 0 ? (
          <p className="text-sm opacity-60">אין עדיין הנחות ליעד הזה.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-1 border p-4"
                style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
              >
                <h3 className="font-semibold">{c.partnerName}</h3>
                <p className="text-sm opacity-70">{c.discountDesc}</p>
                {c.code && <p className="text-sm font-mono">קוד: {c.code}</p>}
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-sm font-semibold underline" style={{ color: "var(--primary)" }}>
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
