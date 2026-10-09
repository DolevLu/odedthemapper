/** Shared (non-action) helpers for the community "public routes" feed. */

export const AUDIENCES = ["family", "couple", "friends", "solo"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_ICON: Record<Audience, string> = { family: "👨‍👩‍👧", couple: "💑", friends: "👯", solo: "🧍" };

export type SnapshotItem = { poiId: string | null; customLabel: string | null; timeOfDay: string | null; note: string | null; order: number };
export type SnapshotDay = { dayIndex: number; note: string | null; items: SnapshotItem[] };

export type RouteSummary = { days: number; stops: number; topCategories: string[]; cover: string | null };

/** Keeps only valid audience tags, in a stable order, as the comma list stored on the template. */
export function cleanAudience(input: unknown): string | null {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  const set = new Set(list.map((x) => String(x).trim()).filter((x): x is Audience => (AUDIENCES as readonly string[]).includes(x)));
  const out = AUDIENCES.filter((a) => set.has(a));
  return out.length ? out.join(",") : null;
}

export function parseAudience(value: string | null | undefined): Audience[] {
  return (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x): x is Audience => (AUDIENCES as readonly string[]).includes(x));
}

/** Community score used for "top rated": a few ratings can't beat many good ones (Bayesian average toward 3.5). */
export function communityScore(avg: number, count: number): number {
  return (avg * count + 3.5 * 3) / (count + 3);
}

/** First name only - the only author detail ever shown publicly. */
export function publicAuthorName(name: string | null, email: string | null): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0];
  if (first) return first.slice(0, 20);
  const local = (email ?? "").split("@")[0];
  return local ? local.slice(0, 12) : null;
}

export function parseSummary(json: string | null | undefined): RouteSummary | null {
  if (!json) return null;
  try {
    const j = JSON.parse(json) as RouteSummary;
    return { days: Number(j.days) || 0, stops: Number(j.stops) || 0, topCategories: Array.isArray(j.topCategories) ? j.topCategories.slice(0, 3) : [], cover: typeof j.cover === "string" ? j.cover : null };
  } catch {
    return null;
  }
}
