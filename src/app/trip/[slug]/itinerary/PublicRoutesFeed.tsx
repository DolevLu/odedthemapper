import Link from "next/link";
import { listPublicRoutes, type PublicRouteCard, type PublicSort } from "@/lib/actions/publicRoutes";
import { AUDIENCES, AUDIENCE_ICON } from "@/lib/publicRoutes";
import { getLang, getServerT } from "@/lib/i18n/server";
import { categoryLabel } from "@/lib/i18n/content";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span aria-label={`${value} / 5`} style={{ fontSize: size, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(value) ? "#F59E0B" : "#D1D5DB" }}>
          ★
        </span>
      ))}
    </span>
  );
}

/** The live community feed that replaces the personal route list: cards of routes other travelers published for this
 * destination, filterable by who they're for and sortable by rating / newest / most used. Server-rendered on every
 * visit, so it is always current. Opening a card shows the route's stop list and its map (see PublicRouteView). */
export async function PublicRoutesFeed({ slug, destinationId, aud, sort }: { slug: string; destinationId: string; aud: string | null; sort: PublicSort }) {
  const [t, lang] = await Promise.all([getServerT(), getLang()]);
  const cards = await listPublicRoutes(destinationId, { audience: aud, sort });
  const href = (a: string | null, s: PublicSort) => `/trip/${slug}/itinerary?view=public${a ? `&aud=${a}` : ""}&sort=${s}`;

  const chip = (active: boolean) => ({
    borderColor: "var(--primary)",
    background: active ? "var(--primary)" : "transparent",
    color: active ? "white" : "var(--text)",
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold">🌍 {t("pub.title")}</h1>
          <p className="text-xs opacity-60">{t("pub.subtitle")}</p>
        </div>
        <Link href={`/trip/${slug}/itinerary`} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "var(--primary)", color: "var(--primary)" }}>
          {t("pub.back")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link href={href(null, sort)} className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={chip(!aud)}>
          {t("pub.aud.all")}
        </Link>
        {AUDIENCES.map((a) => (
          <Link key={a} href={href(a, sort)} className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={chip(aud === a)}>
            {AUDIENCE_ICON[a]} {t(`pub.aud.${a}` as DictionaryKey)}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {(["top", "new", "popular"] as PublicSort[]).map((s) => (
          <Link key={s} href={href(aud, s)} className="rounded-full px-2.5 py-1 font-semibold" style={{ background: sort === s ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent", color: "var(--text)" }}>
            {t(`pub.sort.${s}` as DictionaryKey)}
          </Link>
        ))}
      </div>

      {cards.length === 0 ? (
        <p className="rounded-2xl border p-6 text-center text-sm opacity-70" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          {t("pub.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <RouteCard key={c.id} card={c} href={`/trip/${slug}/itinerary?view=public&route=${c.id}`} lang={lang} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function RouteCard({ card, href, lang, t }: { card: PublicRouteCard; href: string; lang: "he" | "en"; t: (k: DictionaryKey) => string }) {
  return (
    <Link href={href} className="game-pop-in flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md" style={{ borderColor: "rgba(0,0,0,0.08)", background: "var(--surface)" }}>
      <div className="relative h-28 w-full overflow-hidden" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
        {card.summary.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.summary.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        {card.mine && <span className="absolute start-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold">{t("pub.mine")}</span>}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-base font-extrabold leading-tight">{card.name}</h3>
        <p className="text-xs opacity-60">
          {card.author ? `${t("pub.by")} ${card.author} · ` : ""}
          {card.summary.days} {t("pub.days")} · {card.summary.stops} {t("pub.stops")}
        </p>
        <div className="flex items-center gap-1.5 text-xs">
          {card.ratingCount > 0 ? (
            <>
              <Stars value={card.ratingAvg} />
              <span className="font-bold">{card.ratingAvg.toFixed(1)}</span>
              <span className="opacity-50">({card.ratingCount})</span>
            </>
          ) : (
            <span className="opacity-50">{t("pub.noRatings")}</span>
          )}
          {card.copyCount > 0 && <span className="ms-auto opacity-60">⧉ {card.copyCount}</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {card.audience.map((a) => (
            <span key={a} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
              {AUDIENCE_ICON[a]} {t(`pub.aud.${a}` as DictionaryKey)}
            </span>
          ))}
          {card.summary.topCategories.map((c) => (
            <span key={c} className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium">
              {categoryLabel(lang, c)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
