"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveItineraryOwnerId } from "@/lib/access";
import { logGroupActivity } from "@/lib/groupActivity";

export type LiveWeather = {
  tempC: number;
  feelsLikeC: number;
  code: number;
  windKmh: number;
  isDay: boolean;
  /** Highest rain probability over the next ~6 hours, 0-100. */
  rainChanceNext6hPct: number;
};

/** Current conditions from Open-Meteo (free, no key) — one small call, cached
 * 10 minutes per rounded coordinate so a busy Live screen doesn't hammer it. */
export async function getLiveWeather(lat: number, lng: number): Promise<LiveWeather | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}` +
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
        `&hourly=precipitation_probability&forecast_hours=6&timezone=auto`,
      { next: { revalidate: 600 }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const c = data?.current;
    if (!c) return null;
    const probs: number[] = data?.hourly?.precipitation_probability ?? [];
    return {
      tempC: Math.round(c.temperature_2m),
      feelsLikeC: Math.round(c.apparent_temperature),
      code: c.weather_code,
      windKmh: Math.round(c.wind_speed_10m),
      isDay: c.is_day === 1,
      rainChanceNext6hPct: probs.length ? Math.max(...probs) : 0,
    };
  } catch {
    return null;
  }
}

/** The day belongs to the caller's (shared) personal itinerary — the only
 * itinerary Live is allowed to edit. Throws otherwise so a guessed id can't
 * touch someone else's plan. */
async function requireOwnDay(dayId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  const ownerId = await resolveItineraryOwnerId(session.user.id);
  const day = await prisma.itineraryDay.findFirst({
    where: { id: dayId, itinerary: { userId: ownerId, kind: "personal" } },
    select: { id: true },
  });
  if (!day) throw new Error("היום לא נמצא");
  return session.user.id;
}

function shiftTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "We're running late": pushes every timed stop of this day that starts at or
 * after `fromTime` (HH:MM) later by `minutes`. Stops with no time are left
 * alone. */
export async function shiftRemainingStops(dayId: string, fromTime: string, minutes: number, slug: string) {
  const userId = await requireOwnDay(dayId);
  if (!Number.isFinite(minutes) || minutes < -180 || minutes > 480) throw new Error("ערך לא תקין");
  const items = await prisma.itineraryItem.findMany({ where: { itineraryDayId: dayId, timeOfDay: { not: null } } });
  const [fh, fm] = fromTime.split(":").map(Number);
  const fromMinutes = fh * 60 + fm;
  await prisma.$transaction(
    items
      .filter((i) => {
        const [h, m] = i.timeOfDay!.split(":").map(Number);
        return h * 60 + m >= fromMinutes;
      })
      .map((i) => prisma.itineraryItem.update({ where: { id: i.id }, data: { timeOfDay: shiftTime(i.timeOfDay!, minutes) } }))
  );
  await logGroupActivity(userId, { type: "plan_shifted", summary: `הזיז/ה את הנקודות הבאות היום ב-${minutes} דקות`, slug });
  revalidatePath(`/trip/${slug}/itinerary`);
  revalidatePath(`/trip/${slug}/now`);
}

/** Replaces one stop with another point from the same destination, keeping
 * its time slot — used by Live's "it's raining, swap this" suggestion. */
export async function swapStopForPoi(itemId: string, poiId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId }, select: { itineraryDayId: true } });
  if (!item) throw new Error("הנקודה לא נמצאה");
  const userId = await requireOwnDay(item.itineraryDayId);
  await prisma.itineraryItem.update({
    where: { id: itemId },
    data: { poiId, customLabel: null, customLat: null, customLng: null },
  });
  const swapped = await prisma.pointOfInterest.findUnique({ where: { id: poiId }, select: { name: true } });
  await logGroupActivity(userId, { type: "item_added", summary: `החליף/ה נקודה ב-“${swapped?.name ?? "נקודה"}”`, slug });
  revalidatePath(`/trip/${slug}/itinerary`);
  revalidatePath(`/trip/${slug}/now`);
}
