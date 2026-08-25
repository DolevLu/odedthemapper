const LEVEL_TITLES = [
  "טירון מתחיל", // 1
  "חוקר סקרן", // 2
  "נווד עולם", // 3
  "צייד חוויות", // 4
  "מתכנן ותיק", // 5
  "מומחה טיולים", // 6
  "אלוף מסלולים", // 7
  "לגנדת הדרכים", // 8
  "כובש היבשות", // 9
  "אגדת עודד המנקד", // 10+
];

// Points required to REACH each level (index 0 = level 1's threshold, 0
// points). Fixed table, not a formula — early levels come quickly (hooks
// new users), later ones need real sustained engagement. Levels past the
// table's length (11+) never unlock — level 10 ("אגדת עודד המנקד") is the
// permanent top tier, matching LEVEL_TITLES' own "10+" framing.
const LEVEL_THRESHOLDS = [0, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000];

function thresholdForLevel(level: number): number {
  const idx = level - 1;
  return idx < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[idx] : Infinity;
}

// Fixed subscription-renewal discount per level — recomputed live from
// whatever level the user is at right now (not an accumulated balance), so
// it "renews" every month simply by always reflecting the current level.
// Levels above the table (9+) stay at the top tier's percentage.
const DISCOUNT_PCT_BY_LEVEL = [1, 3, 5, 8, 13, 20, 27, 33];

export function discountPctForLevel(level: number): number {
  const idx = Math.min(level, DISCOUNT_PCT_BY_LEVEL.length) - 1;
  return DISCOUNT_PCT_BY_LEVEL[idx];
}

export type LevelInfo = {
  level: number;
  title: string;
  pointsIntoLevel: number;
  pointsForNextLevel: number;
  progressPct: number;
  nextLevelAt: number;
};

export function levelForPoints(points: number): LevelInfo {
  let level = 1;
  while (thresholdForLevel(level + 1) <= points) level++;

  const currentThreshold = thresholdForLevel(level);
  const nextThreshold = thresholdForLevel(level + 1);
  const pointsIntoLevel = points - currentThreshold;
  const pointsForNextLevel = nextThreshold - currentThreshold;
  const progressPct = Math.min(100, Math.round((pointsIntoLevel / pointsForNextLevel) * 100));

  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
    pointsIntoLevel,
    pointsForNextLevel,
    progressPct,
    nextLevelAt: nextThreshold,
  };
}
