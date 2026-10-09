"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hasAccessToDestination, resolveItineraryOwnerId } from "@/lib/access";
import { requireSessionUserId } from "@/lib/groupAccess";
import { consumeApiQuota } from "@/lib/apiQuota";
import { notifyAdmins } from "@/lib/adminAlerts";
import { extractTextDescription } from "@/lib/data/pois";
import { cleanAudience, communityScore, parseAudience, parseSummary, publicAuthorName, type Audience, type RouteSummary, type SnapshotDay } from "@/lib/publicRoutes";

export type PublicRouteCard = {
  id: string;
  name: string;
  author: string | null;
  audience: Audience[];
  summary: RouteSummary;
  ratingAvg: number;
  ratingCount: number;
  copyCount: number;
  publishedAt: string | null;
  mine: boolean;
};

export type PublicSort = "top" | "new" | "popular";

/** The live feed of routes other travelers published for this destination. */
export async function listPublicRoutes(destinationId: string, opts: { audience?: string | null; sort?: PublicSort } = {}): Promise<PublicRouteCard[]> {
  const userId = await requireSessionUserId();
  if (!(await hasAccessToDestination(userId, destinationId))) return [];
  const aud = cleanAudience(opts.audience);
  const rows = await prisma.itineraryTemplate.findMany({
    where: { destinationId, isPublic: true, kind: "personal", ...(aud ? { audience: { contains: aud.split(",")[0] } } : {}) },
    orderBy: { publishedAt: "desc" },
    take: 120,
    include: { user: { select: { name: true, email: true } } },
  });
  const cards: PublicRouteCard[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    author: publicAuthorName(r.user.name, r.user.email),
    audience: parseAudience(r.audience),
    summary: parseSummary(r.summaryJson) ?? { days: 0, stops: 0, topCategories: [], cover: null },
    ratingAvg: r.ratingAvg,
    ratingCount: r.ratingCount,
    copyCount: r.copyCount,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    mine: r.userId === userId,
  }));
  const sort = opts.sort ?? "top";
  if (sort === "top") cards.sort((a, b) => communityScore(b.ratingAvg, b.ratingCount) - communityScore(a.ratingAvg, a.ratingCount) || b.copyCount - a.copyCount);
  else if (sort === "popular") cards.sort((a, b) => b.copyCount - a.copyCount || communityScore(b.ratingAvg, b.ratingCount) - communityScore(a.ratingAvg, a.ratingCount));
  return cards.slice(0, 60);
}

export type PublicRouteStop = { id: string; name: string; lat: number; lng: number; timeOfDay: string | null; photoUrl: string | null; description: string | null; categoryName: string | null };

export type PublicRouteDetail = {
  card: PublicRouteCard;
  description: string | null;
  myRating: number;
  canRate: boolean;
  days: { dayIndex: number; items: PublicRouteStop[] }[];
};

/** One public route with its stops resolved to real places (name, coordinates, photo) - read-only. */
export async function getPublicRoute(templateId: string): Promise<PublicRouteDetail | null> {
  const userId = await requireSessionUserId();
  const r = await prisma.itineraryTemplate.findUnique({ where: { id: templateId }, include: { user: { select: { name: true, email: true } } } });
  if (!r || !r.isPublic || r.kind !== "personal") return null;
  if (!(await hasAccessToDestination(userId, r.destinationId))) return null;

  const snapshot = JSON.parse(r.daysJson) as SnapshotDay[];
  const poiIds = Array.from(new Set(snapshot.flatMap((d) => d.items.map((i) => i.poiId).filter((id): id is string => Boolean(id)))));
  const pois = await prisma.pointOfInterest.findMany({ where: { id: { in: poiIds } }, include: { photos: { take: 1 }, category: { select: { name: true } } } });
  const byId = new Map(pois.map((p) => [p.id, p]));
  const mine = await prisma.publicRouteRating.findUnique({ where: { templateId_userId: { templateId, userId } }, select: { value: true } });

  return {
    card: {
      id: r.id,
      name: r.name,
      author: publicAuthorName(r.user.name, r.user.email),
      audience: parseAudience(r.audience),
      summary: parseSummary(r.summaryJson) ?? { days: snapshot.length, stops: 0, topCategories: [], cover: null },
      ratingAvg: r.ratingAvg,
      ratingCount: r.ratingCount,
      copyCount: r.copyCount,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      mine: r.userId === userId,
    },
    description: r.description,
    myRating: mine?.value ?? 0,
    canRate: r.userId !== userId,
    days: [...snapshot]
      .sort((a, b) => a.dayIndex - b.dayIndex)
      .map((day) => ({
        dayIndex: day.dayIndex,
        items: [...day.items]
          .sort((a, b) => a.order - b.order)
          .flatMap((item): PublicRouteStop[] => {
            const poi = item.poiId ? byId.get(item.poiId) : null;
            if (!poi) return item.customLabel ? [{ id: `${day.dayIndex}-${item.order}`, name: item.customLabel, lat: NaN, lng: NaN, timeOfDay: item.timeOfDay, photoUrl: null, description: null, categoryName: null }] : [];
            return [{ id: poi.id, name: item.customLabel ?? poi.name, lat: poi.lat, lng: poi.lng, timeOfDay: item.timeOfDay, photoUrl: poi.photos[0]?.url ?? null, description: extractTextDescription(poi.rawDescriptionHtml), categoryName: poi.category.name }];
          }),
      })),
  };
}

export type PublishSettings = { isPublic: boolean; audience?: string[] | string | null; description?: string | null; name?: string | null };

async function summaryFor(snapshot: SnapshotDay[]): Promise<RouteSummary> {
  const poiIds = Array.from(new Set(snapshot.flatMap((d) => d.items.map((i) => i.poiId).filter((id): id is string => Boolean(id)))));
  const stops = snapshot.reduce((n, d) => n + d.items.length, 0);
  const pois = poiIds.length ? await prisma.pointOfInterest.findMany({ where: { id: { in: poiIds } }, select: { id: true, category: { select: { name: true } }, photos: { take: 1, select: { url: true } } } }) : [];
  const counts = new Map<string, number>();
  for (const d of snapshot) for (const i of d.items) {
    const p = pois.find((x) => x.id === i.poiId);
    if (p) counts.set(p.category.name, (counts.get(p.category.name) ?? 0) + 1);
  }
  const topCategories = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
  const cover = pois.find((p) => p.photos[0]?.url)?.photos[0]?.url ?? null;
  return { days: snapshot.length, stops, topCategories, cover };
}

/** Publish (or unpublish / edit the settings of) one of MY saved routes. The categories, days, stops and cover
 * photo tags are computed automatically; the author only chooses name, who it's for and an optional description. */
export async function setRoutePublic(templateId: string, slug: string, settings: PublishSettings): Promise<{ ok: true } | { error: string }> {
  const userId = await requireSessionUserId();
  const ownerId = await resolveItineraryOwnerId(userId);
  const tpl = await prisma.itineraryTemplate.findUnique({ where: { id: templateId } });
  if (!tpl || tpl.userId !== ownerId || tpl.kind !== "personal") return { error: "not-found" };

  if (!settings.isPublic) {
    await prisma.itineraryTemplate.update({ where: { id: templateId }, data: { isPublic: false } });
    revalidatePath(`/trip/${slug}/itinerary`);
    return { ok: true };
  }
  const snapshot = JSON.parse(tpl.daysJson) as SnapshotDay[];
  const summary = await summaryFor(snapshot);
  if (summary.stops < 3) return { error: "too-short" };
  if (!tpl.isPublic && !(await consumeApiQuota(userId, "publishRoute"))) return { error: "quota" };

  const name = (settings.name ?? tpl.name).replace(/\s+/g, " ").trim().slice(0, 60);
  if (name.length < 3) return { error: "bad-name" };
  const description = (settings.description ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  await prisma.itineraryTemplate.update({
    where: { id: templateId },
    data: {
      isPublic: true,
      publishedAt: tpl.publishedAt ?? new Date(),
      name,
      description,
      audience: cleanAudience(settings.audience),
      summaryJson: JSON.stringify(summary),
    },
  });
  revalidatePath(`/trip/${slug}/itinerary`);
  return { ok: true };
}

/** 1-5 stars from anyone with access to the destination except the route's own author. */
export async function ratePublicRoute(templateId: string, slug: string, value: number): Promise<{ ok: true; ratingAvg: number; ratingCount: number } | { error: string }> {
  const userId = await requireSessionUserId();
  const v = Math.round(Number(value));
  if (!(v >= 1 && v <= 5)) return { error: "bad-value" };
  const tpl = await prisma.itineraryTemplate.findUnique({ where: { id: templateId }, select: { userId: true, destinationId: true, isPublic: true } });
  if (!tpl || !tpl.isPublic) return { error: "not-found" };
  if (tpl.userId === userId) return { error: "own-route" };
  if (!(await hasAccessToDestination(userId, tpl.destinationId))) return { error: "no-access" };

  await prisma.publicRouteRating.upsert({
    where: { templateId_userId: { templateId, userId } },
    create: { templateId, userId, value: v },
    update: { value: v },
  });
  const agg = await prisma.publicRouteRating.aggregate({ where: { templateId }, _avg: { value: true }, _count: { value: true } });
  const ratingAvg = Math.round((agg._avg.value ?? 0) * 10) / 10;
  const ratingCount = agg._count.value;
  await prisma.itineraryTemplate.update({ where: { id: templateId }, data: { ratingAvg, ratingCount } });
  revalidatePath(`/trip/${slug}/itinerary`);
  return { ok: true, ratingAvg, ratingCount };
}

/** "Use this route": replaces MY active itinerary for the destination with a copy of the public route's days and
 * stops (the UI asks for confirmation first, same as applying a saved route). */
export async function copyPublicRoute(templateId: string, slug: string): Promise<{ ok: true } | { error: string }> {
  const userId = await requireSessionUserId();
  const tpl = await prisma.itineraryTemplate.findUnique({ where: { id: templateId } });
  if (!tpl || !tpl.isPublic || tpl.kind !== "personal") return { error: "not-found" };
  if (!(await hasAccessToDestination(userId, tpl.destinationId))) return { error: "no-access" };

  const ownerId = await resolveItineraryOwnerId(userId);
  const itinerary = await prisma.itinerary.upsert({
    where: { userId_destinationId_kind: { userId: ownerId, destinationId: tpl.destinationId, kind: "personal" } },
    create: { userId: ownerId, destinationId: tpl.destinationId, kind: "personal" },
    update: {},
  });
  await prisma.itineraryDay.deleteMany({ where: { itineraryId: itinerary.id } });
  const snapshot = JSON.parse(tpl.daysJson) as SnapshotDay[];
  for (const day of snapshot) {
    const createdDay = await prisma.itineraryDay.create({ data: { itineraryId: itinerary.id, dayIndex: day.dayIndex, note: day.note } });
    for (const item of day.items) {
      await prisma.itineraryItem.create({
        data: { itineraryDayId: createdDay.id, poiId: item.poiId, customLabel: item.customLabel, timeOfDay: item.timeOfDay, note: item.note, order: item.order },
      });
    }
  }
  if (tpl.userId !== ownerId) await prisma.itineraryTemplate.update({ where: { id: templateId }, data: { copyCount: { increment: 1 } } });
  revalidatePath(`/trip/${slug}/itinerary`);
  return { ok: true };
}

/** Flags a public route to the admins (name/description are user-written text, so there has to be a way to report). */
export async function reportPublicRoute(templateId: string, reason: string): Promise<{ ok: true }> {
  const userId = await requireSessionUserId();
  const tpl = await prisma.itineraryTemplate.findUnique({ where: { id: templateId }, select: { name: true, destinationId: true } });
  if (tpl) {
    await prisma.feedback.create({ data: { userId, kind: "report", description: `[public route ${templateId}] "${tpl.name}" - ${reason.slice(0, 300)}`, pageUrl: `/trip/-/itinerary?view=public&route=${templateId}` } });
    await notifyAdmins({ title: "🚩 דיווח על מסלול ציבורי", body: `"${tpl.name}" - ${reason.slice(0, 120)}`, url: "/admin" });
  }
  return { ok: true };
}
