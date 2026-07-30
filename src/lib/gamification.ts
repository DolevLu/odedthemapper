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

/** Points required to REACH a given level — quadratic growth (50 * (level-1)^2)
 * so early levels come quickly (hooks new users) while later levels need
 * sustained, ongoing engagement (keeps people coming back). */
function thresholdForLevel(level: number): number {
  return 50 * (level - 1) ** 2;
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
