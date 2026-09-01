import { notFound } from "next/navigation";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { fetchWeatherForecast, weatherIcon, weatherLabel } from "@/lib/weather";
import { isGenericAreaName } from "@/lib/geo";

const WEEKDAY_FMT = new Intl.DateTimeFormat("he-IL", { weekday: "short" });
const DATE_FMT = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" });

export default async function WeatherPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  // Averaging every POI's coordinates across the WHOLE destination used to
  // land the forecast point wherever the country's points happen to be
  // scattered (rural areas included) rather than the main city travelers
  // actually care about — for a destination like Czech Republic, that could
  // pull the average well outside Prague into a spot with a different
  // microclimate entirely, which is exactly the "shows rain when Google
  // shows sun for Prague" symptom. Same "busiest area = the main/capital
  // city" heuristic the map's default zoom already uses (see MapScreen),
  // now reused here: average only the coordinates of the area with the most
  // points, not every area combined — and same fix as the map: skip generic
  // "Road Trip"/"כללי"/"שאר X" catch-all folders (see isGenericAreaName),
  // which otherwise almost always outnumber any single real named city.
  const areas = await prisma.area.findMany({
    where: { destinationId: destination.id },
    select: {
      name: true,
      categories: { select: { pois: { where: { geometryType: "point" }, select: { lat: true, lng: true } } } },
    },
  });
  const areaPointCounts = areas.map((area) => ({ name: area.name, points: area.categories.flatMap((c) => c.pois) }));
  const namedAreas = areaPointCounts.filter((a) => !isGenericAreaName(a.name));
  const candidates = namedAreas.length > 0 ? namedAreas : areaPointCounts;
  const busiest = candidates.reduce<{ name: string; points: { lat: number; lng: number }[] } | null>(
    (best, area) => (area.points.length > (best?.points.length ?? 0) ? area : best),
    null
  );
  const lat = busiest && busiest.points.length > 0 ? busiest.points.reduce((sum, p) => sum + p.lat, 0) / busiest.points.length : null;
  const lng = busiest && busiest.points.length > 0 ? busiest.points.reduce((sum, p) => sum + p.lng, 0) / busiest.points.length : null;
  const forecast = lat != null && lng != null ? await fetchWeatherForecast(lat, lng) : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        🌤️ מזג אוויר - {destination.name}
      </h1>

      {!forecast ? (
        <p className="text-sm opacity-60">לא הצלחנו לטעון תחזית מזג אוויר כרגע - נסו שוב מאוחר יותר.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {forecast.map((day, i) => {
            const date = new Date(`${day.date}T00:00:00`);
            return (
              <div
                key={day.date}
                className="game-pop-in flex flex-col items-center gap-1.5 border p-4 text-center transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
                style={{
                  borderRadius: "var(--radius)",
                  borderColor: i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                  background: i === 0 ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface)",
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <p className="text-xs font-bold opacity-70">{i === 0 ? "היום" : WEEKDAY_FMT.format(date)}</p>
                <p className="text-[11px] opacity-50">{DATE_FMT.format(date)}</p>
                <span className="my-1 text-3xl">{weatherIcon(day.code)}</span>
                <p className="text-xs opacity-60">{weatherLabel(day.code)}</p>
                <p className="text-sm font-bold">
                  {day.maxC}° <span className="font-normal opacity-50">/ {day.minC}°</span>
                </p>
                {day.precipitationChancePct > 0 && (
                  <p className="text-[11px]" style={{ color: "#2563EB" }}>
                    💧 {day.precipitationChancePct}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
