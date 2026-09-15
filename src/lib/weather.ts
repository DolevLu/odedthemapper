export type DayForecast = {
  date: string;
  maxC: number;
  minC: number;
  precipitationChancePct: number;
  code: number;
};

// WMO weather codes (used by Open-Meteo) mapped to an emoji + short label in
// both languages — covers the common buckets, not every one of the ~30 exact
// codes.
const WEATHER_META: { codes: number[]; icon: string; label: { he: string; en: string } }[] = [
  { codes: [0], icon: "☀️", label: { he: "בהיר", en: "Clear" } },
  { codes: [1, 2], icon: "🌤️", label: { he: "מעונן חלקית", en: "Partly cloudy" } },
  { codes: [3], icon: "☁️", label: { he: "מעונן", en: "Cloudy" } },
  { codes: [45, 48], icon: "🌫️", label: { he: "ערפל", en: "Fog" } },
  { codes: [51, 53, 55, 56, 57], icon: "🌦️", label: { he: "טפטוף", en: "Drizzle" } },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], icon: "🌧️", label: { he: "גשם", en: "Rain" } },
  { codes: [71, 73, 75, 77, 85, 86], icon: "❄️", label: { he: "שלג", en: "Snow" } },
  { codes: [95, 96, 99], icon: "⛈️", label: { he: "סופת רעמים", en: "Thunderstorm" } },
];

export function weatherIcon(code: number): string {
  return WEATHER_META.find((m) => m.codes.includes(code))?.icon ?? "🌡️";
}
export function weatherLabel(code: number, lang: "he" | "en" = "he"): string {
  return WEATHER_META.find((m) => m.codes.includes(code))?.label[lang] ?? "";
}

/** Free, no-key weather API (Open-Meteo) — a 7-day daily forecast for the
 * given coordinates. Returns null on any failure so the page can show a
 * graceful empty state instead of crashing. */
export async function fetchWeatherForecast(lat: number, lng: number): Promise<DayForecast[] | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const days: string[] | undefined = data?.daily?.time;
    if (!days) return null;
    return days.map((date, i) => ({
      date,
      maxC: Math.round(data.daily.temperature_2m_max[i]),
      minC: Math.round(data.daily.temperature_2m_min[i]),
      precipitationChancePct: data.daily.precipitation_probability_max?.[i] ?? 0,
      code: data.daily.weather_code[i],
    }));
  } catch {
    return null;
  }
}
