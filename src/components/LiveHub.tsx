"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/i18n/LanguageContext";
import { getLiveWeather, shiftRemainingStops, swapStopForPoi, type LiveWeather } from "@/lib/actions/live";
import { askTravi, type TraviReply } from "@/lib/actions/travi";
import { weatherIcon, weatherLabel } from "@/lib/weather";
import { haversineKm } from "@/lib/geo";
import { isIndoorFriendly, isOutdoorStop } from "@/lib/indoor";
import { ensureGoogleMaps, loadPlacesLibrary } from "@/hooks/useGoogleMaps";
import type { FlatPoi } from "@/lib/data/pois";

export type LiveStop = {
  id: string;
  dayId: string;
  time: string | null;
  label: string;
  poiId: string | null;
  categoryName: string | null;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
};

type OpenState = "open" | "closed" | "unknown";

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const STORM_CODES = new Set([95, 96, 99]);

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Live open/closed for one stop, from Google Places' own opening hours (the
 * POI database itself has none) - looked up on demand so it costs nothing
 * until someone actually asks. */
async function lookupOpenNow(stop: LiveStop): Promise<OpenState> {
  if (stop.lat == null || stop.lng == null) return "unknown";
  try {
    await ensureGoogleMaps();
    await loadPlacesLibrary();
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    const found = await new Promise<google.maps.places.PlaceResult | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 6000);
      service.findPlaceFromQuery(
        {
          query: stop.label,
          fields: ["place_id"],
          locationBias: { center: { lat: stop.lat!, lng: stop.lng! }, radius: 400 },
        },
        (results, status) => {
          clearTimeout(timer);
          resolve(status === google.maps.places.PlacesServiceStatus.OK && results?.[0] ? results[0] : null);
        }
      );
    });
    if (!found?.place_id) return "unknown";
    const details = await new Promise<google.maps.places.PlaceResult | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 6000);
      service.getDetails({ placeId: found.place_id!, fields: ["opening_hours", "business_status", "utc_offset_minutes"] }, (place, status) => {
        clearTimeout(timer);
        resolve(status === google.maps.places.PlacesServiceStatus.OK ? place : null);
      });
    });
    if (!details) return "unknown";
    if (details.business_status === google.maps.places.BusinessStatus.CLOSED_PERMANENTLY) return "closed";
    const open = details.opening_hours?.isOpen?.();
    if (open === undefined) return "unknown";
    return open ? "open" : "closed";
  } catch {
    return "unknown";
  }
}

export function LiveHub({
  slug,
  destinationId,
  destinationName,
  center,
  stops,
  pois,
}: {
  slug: string;
  destinationId: string;
  destinationName: string;
  center: { lat: number; lng: number } | null;
  stops: LiveStop[] | null;
  pois: FlatPoi[];
}) {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [weatherFailed, setWeatherFailed] = useState(false);
  const [openStates, setOpenStates] = useState<Record<string, OpenState>>({});
  const [checkingOpen, setCheckingOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [reply, setReply] = useState<TraviReply | null>(null);
  const [showAllRemaining, setShowAllRemaining] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const weatherPoint = position ?? center;
  const weatherLat = weatherPoint?.lat;
  const weatherLng = weatherPoint?.lng;
  useEffect(() => {
    if (weatherLat == null || weatherLng == null) return;
    let cancelled = false;
    const load = () =>
      getLiveWeather(weatherLat, weatherLng).then((w) => {
        if (cancelled) return;
        setWeather(w);
        setWeatherFailed(!w);
      });
    load();
    const id = setInterval(load, 10 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [weatherLat, weatherLng]);

  function requestLocation() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setNotice(t("now.geoFailed")),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const timed = useMemo(() => (stops ?? []).filter((s) => s.time), [stops]);

  const { current, next, remaining } = useMemo(() => {
    if (nowMinutes === null) return { current: null, next: null, remaining: [] as LiveStop[] };
    let cur: LiveStop | null = null;
    let nxt: LiveStop | null = null;
    for (const s of timed) {
      const m = toMinutes(s.time!);
      if (m <= nowMinutes) cur = s;
      else if (!nxt) nxt = s;
    }
    const rem = timed.filter((s) => s === cur || toMinutes(s.time!) > nowMinutes);
    return { current: cur, next: nxt, remaining: rem };
  }, [timed, nowMinutes]);

  const rainy = weather ? RAIN_CODES.has(weather.code) || weather.rainChanceNext6hPct >= 60 : false;
  const stormy = weather ? STORM_CODES.has(weather.code) : false;

  // The stop the weather advice is about: what's happening now, else what's next.
  const focusStop = current ?? next;
  const focusExposed = focusStop ? !isIndoorFriendly(focusStop.categoryName ?? "") : false;

  const swapCandidates = useMemo(() => {
    if (!(rainy || stormy) || !focusStop || !focusExposed || focusStop.lat == null || focusStop.lng == null) return [];
    const scheduled = new Set((stops ?? []).map((s) => s.poiId).filter(Boolean));
    const from: [number, number] = [focusStop.lat, focusStop.lng];
    return pois
      .filter((p) => p.geometryType === "point" && isIndoorFriendly(p.categoryName) && !scheduled.has(p.id))
      .map((p) => ({ poi: p, km: haversineKm(from, [p.lat, p.lng]) }))
      .filter((x) => x.km <= 3)
      .sort((a, b) => a.km - b.km)
      .slice(0, 3);
  }, [rainy, stormy, focusStop, focusExposed, pois, stops]);

  let tip: string | null = null;
  if (weather) {
    if (stormy) tip = t("live.tipStorm");
    else if (rainy) tip = t("live.tipRain");
    else if (weather.tempC >= 33) tip = t("live.tipHot");
    else if (weather.tempC <= 4) tip = t("live.tipCold");
    else if (!weather.isDay) tip = t("live.tipNight");
    else tip = t("live.tipGood");
  }

  function applyLate(minutes: number) {
    const from = current?.time ?? next?.time;
    const dayId = (current ?? next)?.dayId;
    if (!from || !dayId) return;
    startTransition(async () => {
      try {
        await shiftRemainingStops(dayId, from, minutes, slug);
        setNotice(`${t("live.lateApplied")} (+${minutes} ${t("live.min")})`);
        router.refresh();
      } catch {
        setNotice(t("weather.loadFailed"));
      }
    });
  }

  function applySwap(stop: LiveStop, poiId: string) {
    startTransition(async () => {
      try {
        await swapStopForPoi(stop.id, poiId, slug);
        setNotice(t("live.swapped"));
        router.refresh();
      } catch {
        setNotice(t("weather.loadFailed"));
      }
    });
  }

  const checkOpen = useCallback(async () => {
    setCheckingOpen(true);
    const targets = remaining.slice(0, 5);
    const results = await Promise.all(targets.map(async (s) => [s.id, await lookupOpenNow(s)] as const));
    setOpenStates((prev) => ({ ...prev, ...Object.fromEntries(results) }));
    setCheckingOpen(false);
  }, [remaining]);

  function liveContext(): string {
    const parts: string[] = [];
    if (now) parts.push(`${lang === "he" ? "שעה" : "Time"}: ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    if (weather) {
      parts.push(
        `${lang === "he" ? "מזג אוויר" : "Weather"}: ${weatherLabel(weather.code, lang)} ${weather.tempC}°C, ${lang === "he" ? "סיכוי גשם" : "rain chance"} ${weather.rainChanceNext6hPct}%`
      );
    }
    if (current) parts.push(`${lang === "he" ? "עכשיו במסלול" : "Current stop"}: ${current.label}`);
    if (next) parts.push(`${lang === "he" ? "הבא" : "Next"}: ${next.label} (${next.time})`);
    if (position) parts.push(lang === "he" ? "המיקום של המטייל ידוע ומועבר בנפרד" : "traveler location is provided");
    return parts.join("\n");
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || asking) return;
    setAsking(true);
    setReply(null);
    try {
      setReply(await askTravi(destinationId, q, position, liveContext()));
    } catch {
      setReply({ text: t("weather.loadFailed"), suggestions: [] });
    }
    setAsking(false);
  }

  const chips = [t("live.chipHungry"), t("live.chipCoffee"), t("live.chipRain"), t("live.chipKids"), t("live.chipQuiet")];
  const timeText = now ? now.toLocaleTimeString(lang === "he" ? "he-IL" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const stateBadge = (s: OpenState | undefined) =>
    s === "open" ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{t("live.open")}</span>
    ) : s === "closed" ? (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">{t("live.closed")}</span>
    ) : s === "unknown" ? (
      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-bold opacity-60">{t("live.unknown")}</span>
    ) : null;

  return (
    <section
      className="flex flex-col gap-4 border p-4 sm:p-5"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      aria-label={t("live.title")}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            {t("live.title")}
          </h1>
          <p className="text-xs opacity-60 sm:text-sm">
            {destinationName} · {t("live.subtitle")}
          </p>
        </div>
        <div className="text-end">
          <p className="text-[11px] font-semibold opacity-50">{t("live.localTime")}</p>
          <p className="text-2xl font-extrabold tabular-nums" style={{ color: "var(--primary)" }}>
            {timeText}
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
          {weather ? (
            <>
              <span className="text-4xl" aria-hidden>
                {weatherIcon(weather.code)}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold">
                  {weather.tempC}° <span className="text-sm font-medium opacity-60">{weatherLabel(weather.code, lang)}</span>
                </p>
                <p className="text-xs opacity-60">
                  {t("live.feelsLike")} {weather.feelsLikeC}° · 💧 {weather.rainChanceNext6hPct}% · {t("live.wind")} {weather.windKmh}
                </p>
                <p className="text-[11px] opacity-50">{t("live.rainChance")}</p>
              </div>
            </>
          ) : (
            <p className="text-sm opacity-60">{weatherFailed ? t("live.weatherUnavailable") : "..."}</p>
          )}
        </div>

        <div className="flex flex-col justify-center gap-2 rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
          {tip && <p className="text-sm font-medium leading-snug">{tip}</p>}
          {!position && (
            <button onClick={requestLocation} className="self-start text-xs font-semibold underline opacity-70 hover:opacity-100">
              📍 {t("live.enableLocation")}
            </button>
          )}
        </div>
      </div>

      {swapCandidates.length > 0 && focusStop && (
        <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: "color-mix(in srgb, #0284C7 10%, var(--surface))" }}>
          <p className="text-xs font-semibold opacity-70">
            {focusStop.label}
          </p>
          {swapCandidates.map(({ poi, km }) => (
            <div key={poi.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {poi.name} <span className="text-xs opacity-50">· {poi.categoryName} · {km.toFixed(1)} km</span>
              </span>
              <button
                onClick={() => applySwap(focusStop, poi.id)}
                disabled={pending}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: "#0284C7" }}
              >
                {t("live.swapWith")}
              </button>
            </div>
          ))}
        </div>
      )}

      {timed.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed p-3">
          <p className="text-sm opacity-70">{t("live.noPlanToday")}</p>
          <Link href={`/trip/${slug}/itinerary`} className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
            {t("live.buildPlan")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, #22C55E 40%, transparent)" }}>
              <p className="text-[11px] font-bold text-emerald-600">{t("live.nowInPlan")}</p>
              <p className="truncate text-sm font-bold">{current ? current.label : next ? t("live.noCurrentStop") : t("live.dayDone")}</p>
              {current?.time && <p className="text-xs opacity-60">{current.time}</p>}
              {!current && next && <p className="truncate text-sm font-bold">{next.label}</p>}
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
              <p className="text-[11px] font-bold opacity-60">{t("live.nextUp")}</p>
              {next && nowMinutes !== null ? (
                <>
                  <p className="truncate text-sm font-bold">{next.label}</p>
                  <p className="text-xs opacity-60">
                    {next.time} · {t("live.inMin")} {Math.max(0, toMinutes(next.time!) - nowMinutes)} {t("live.min")}
                  </p>
                </>
              ) : (
                <p className="text-sm opacity-60">-</p>
              )}
            </div>
          </div>

          {remaining.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold">{t("live.remainingTitle")}</h2>
                <button
                  onClick={checkOpen}
                  disabled={checkingOpen}
                  className="rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50"
                  style={{ borderColor: "var(--primary)" }}
                >
                  {checkingOpen ? t("live.checking") : `🕐 ${t("live.checkOpen")}`}
                </button>
              </div>
              <ul className="flex flex-col gap-1.5">
                {(showAllRemaining ? remaining : remaining.slice(0, 2)).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs opacity-60">{s.time}</span> {s.label}
                      {isOutdoorStop(s.categoryName) && (rainy || stormy) ? " 🌧️" : ""}
                    </span>
                    {stateBadge(openStates[s.id])}
                  </li>
                ))}
              </ul>
              {remaining.length > 2 && (
                <button
                  onClick={() => setShowAllRemaining((v) => !v)}
                  aria-expanded={showAllRemaining}
                  aria-label={showAllRemaining ? t("live.showLess") : t("live.showAll")}
                  className="mx-auto flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  <span aria-hidden className="inline-block transition-transform" style={{ transform: showAllRemaining ? "rotate(180deg)" : "none" }}>⌄</span>
                  {showAllRemaining ? t("live.showLess") : `${t("live.showAll")} (${remaining.length})`}
                </button>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2 border-t pt-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                <span className="text-xs font-semibold">
                  ⏱️ {t("live.lateTitle")} <span className="font-normal opacity-60">{t("live.lateBody")}</span>
                </span>
                {[15, 30, 60, 90].map((m) => (
                  <button
                    key={m}
                    onClick={() => applyLate(m)}
                    disabled={pending}
                    className="rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                    style={{ borderColor: "var(--primary)" }}
                  >
                    +{m} {t("live.min")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {notice && (
        <p className="rounded-lg bg-black/5 px-3 py-2 text-xs font-semibold" role="status">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
        <h2 className="text-sm font-bold">🧭 {t("live.askTitle")}</h2>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => {
                setQuestion(c);
                void ask(c);
              }}
              disabled={asking}
              className="rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              {c}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("live.askPlaceholder")}
            maxLength={300}
            className="min-w-0 flex-1 rounded-full border px-3 py-2 text-sm"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", background: "var(--surface)" }}
          />
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {t("live.send")}
          </button>
        </form>
        {asking && <p className="text-xs opacity-60">{t("live.thinking")}</p>}
        {reply && (
          <div className="flex flex-col gap-2">
            <p className="whitespace-pre-line text-sm leading-relaxed">{reply.text.replace(/\*+/g, "")}</p>
            {reply.suggestions.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {reply.suggestions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/trip/${slug}?focus=${s.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
                      style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
                    >
                      <span className="min-w-0 truncate">
                        {s.name} <span className="text-xs opacity-50">· {s.categoryName}</span>
                      </span>
                      <span className="shrink-0 text-xs opacity-60">{s.distanceKm != null ? `${s.distanceKm.toFixed(1)} km` : "🗺️"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
