import { notFound } from "next/navigation";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { fetchWeatherForecast, weatherIcon, weatherLabel } from "@/lib/weather";

const WEEKDAY_FMT = new Intl.DateTimeFormat("he-IL", { weekday: "short" });
const DATE_FMT = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" });

export default async function WeatherPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const avg = await prisma.pointOfInterest.aggregate({
    where: { geometryType: "point", category: { area: { destinationId: destination.id } } },
    _avg: { lat: true, lng: true },
  });
  const lat = avg._avg.lat;
  const lng = avg._avg.lng;
  const forecast = lat != null && lng != null ? await fetchWeatherForecast(lat, lng) : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        🌤️ מזג אוויר — {destination.name}
      </h1>

      {!forecast ? (
        <p className="text-sm opacity-60">לא הצלחנו לטעון תחזית מזג אוויר כרגע — נסו שוב מאוחר יותר.</p>
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
