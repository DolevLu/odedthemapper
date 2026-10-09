"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { colorForDay } from "@/lib/geo";
import { useTranslation } from "@/components/i18n/LanguageContext";
import { copyPublicRoute, ratePublicRoute, reportPublicRoute, type PublicRouteDetail } from "@/lib/actions/publicRoutes";
import { AUDIENCE_ICON } from "@/lib/publicRoutes";
import { categoryLabel } from "@/lib/i18n/content";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

function StarsInput({ value, onPick, disabled }: { value: number; onPick: (n: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onPick(n)}
          aria-label={`${n}`}
          className="px-0.5 text-2xl leading-none disabled:opacity-40"
          style={{ color: n <= (hover || value) ? "#F59E0B" : "#D1D5DB" }}
        >
          ★
        </button>
      ))}
    </span>
  );
}

/** One community route, opened from the feed: its details and tags, the day-by-day stop list and the route map,
 * plus the community actions - rate it, use it as my own route, or report it. */
export function PublicRouteView({ slug, route, hasExistingDays }: { slug: string; route: PublicRouteDetail; hasExistingDays: boolean }) {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [myRating, setMyRating] = useState(route.myRating);
  const [stats, setStats] = useState({ avg: route.card.ratingAvg, count: route.card.ratingCount });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const mapDays: MapDay[] = route.days.map((day) => ({
    dayIndex: day.dayIndex,
    points: day.items
      .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
      .map((i) => ({ id: i.id, name: i.name, lat: i.lat, lng: i.lng, description: i.description, photoUrl: i.photoUrl, timeOfDay: i.timeOfDay })),
  }));

  function rate(n: number) {
    setMyRating(n);
    startTransition(async () => {
      const res = await ratePublicRoute(route.card.id, slug, n);
      if ("error" in res) setNote(t("pub.failed"));
      else setStats({ avg: res.ratingAvg, count: res.ratingCount });
    });
  }

  async function applyRoute() {
    setBusy(true);
    const res = await copyPublicRoute(route.card.id, slug);
    if ("error" in res) {
      setBusy(false);
      setNote(t("pub.failed"));
      return;
    }
    setNote(t("pub.copied"));
    router.push(`/trip/${slug}/itinerary`);
    router.refresh();
  }

  async function report() {
    const reason = window.prompt(t("pub.reportAsk"));
    if (!reason) return;
    await reportPublicRoute(route.card.id, reason);
    setNote(t("pub.reported"));
  }

  const c = route.card;
  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/trip/${slug}/itinerary?view=public`} className="text-xs font-semibold underline opacity-70">
            {t("pub.backToFeed")}
          </Link>
          <h1 className="mt-1 text-xl font-extrabold">{c.name}</h1>
          <p className="text-xs opacity-60">
            {c.author ? `${t("pub.by")} ${c.author} · ` : ""}
            {c.summary.days} {t("pub.days")} · {c.summary.stops} {t("pub.stops")}
            {c.copyCount > 0 ? ` · ⧉ ${c.copyCount} ${t("pub.uses")}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {c.audience.map((a) => (
              <span key={a} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                {AUDIENCE_ICON[a]} {t(`pub.aud.${a}` as DictionaryKey)}
              </span>
            ))}
            {c.summary.topCategories.map((cat) => (
              <span key={cat} className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium">
                {categoryLabel(lang, cat)}
              </span>
            ))}
          </div>
          {route.description && <p className="mt-2 max-w-xl text-sm opacity-80">{route.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          {confirming ? (
            <div className="flex flex-col items-end gap-1.5">
              <span className="max-w-[16rem] text-end text-xs opacity-70">{hasExistingDays ? t("pub.useConfirm") : ""}</span>
              <div className="flex gap-2">
                <button onClick={applyRoute} disabled={busy} className="rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
                  {hasExistingDays ? t("pub.confirmYes") : t("pub.use")}
                </button>
                <button onClick={() => setConfirming(false)} className="text-xs font-semibold opacity-60">
                  {t("itinerary.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => (hasExistingDays ? setConfirming(true) : applyRoute())}
              disabled={busy}
              className="rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #6D28D9, #EC4899)" }}
            >
              {t("pub.use")}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-3 text-sm" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <span className="flex items-center gap-1.5">
          <span style={{ color: "#F59E0B", fontSize: 18 }}>★</span>
          {stats.count > 0 ? (
            <>
              <b>{stats.avg.toFixed(1)}</b>
              <span className="opacity-50">
                ({stats.count} {t("pub.ratings")})
              </span>
            </>
          ) : (
            <span className="opacity-50">{t("pub.noRatings")}</span>
          )}
        </span>
        {route.canRate ? (
          <span className="flex items-center gap-1.5">
            <span className="text-xs opacity-70">{t("pub.rate")}</span>
            <StarsInput value={myRating} onPick={rate} />
          </span>
        ) : (
          <span className="text-xs opacity-60">{t("pub.ownRoute")}</span>
        )}
        {!c.mine && (
          <button onClick={report} className="ms-auto text-xs opacity-50 hover:opacity-100">
            {t("pub.report")}
          </button>
        )}
      </div>
      {note && <p className="text-sm font-semibold text-emerald-600">{note}</p>}

      <div className="flex flex-col gap-6 lg:h-[calc(100vh-300px)] lg:min-h-[420px] lg:flex-row lg:items-stretch">
        <div className="flex flex-col gap-4 lg:min-h-0 lg:w-[420px] lg:shrink-0 lg:overflow-y-auto">
          {route.days.map((day) => (
            <div key={day.dayIndex}>
              <p className="mb-2 text-sm font-extrabold" style={{ color: colorForDay(day.dayIndex - 1) }}>
                {t("pub.day")} {day.dayIndex}
              </p>
              <div className="flex flex-col gap-1.5">
                {day.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 border p-2 text-sm" style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                    {item.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photoUrl} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    )}
                    {item.timeOfDay && (
                      <span className="shrink-0 font-mono text-xs font-bold" style={{ color: "var(--primary)" }}>
                        {item.timeOfDay}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.name}</span>
                      {item.categoryName && <span className="block truncate text-[11px] opacity-50">{categoryLabel(lang, item.categoryName)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {mapDays.some((d) => d.points.length > 0) && (
          <div className="h-[55vh] lg:h-auto lg:min-h-0 lg:flex-1">
            <DayRouteMap days={mapDays} fillHeight />
          </div>
        )}
      </div>
    </div>
  );
}
