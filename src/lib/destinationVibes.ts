export type VibeTag =
  | "beach"
  | "nature"
  | "culture"
  | "nightlife"
  | "food"
  | "romantic"
  | "family"
  | "adventure"
  | "shopping"
  | "relaxation"
  | "history"
  | "budget"
  | "luxury"
  | "winter";

/**
 * Curated per-destination character tags used to score quiz answers against
 * destinations. This is a deterministic matching algorithm over real,
 * hand-picked destination attributes — not a live AI/LLM call.
 */
export const DESTINATION_VIBES: Record<string, VibeTag[]> = {
  italy: ["culture", "history", "food", "romantic", "shopping"],
  prague: ["history", "nightlife", "culture", "budget", "winter"],
  japan: ["culture", "food", "adventure", "history", "shopping"],
  copenhagen: ["culture", "food", "relaxation", "family", "luxury"],
  budapest: ["history", "nightlife", "relaxation", "budget", "culture"],
  thailand: ["beach", "adventure", "food", "budget", "nightlife"],
  china: ["history", "culture", "adventure", "food"],
  vietnam: ["nature", "adventure", "food", "budget", "history"],
  poland: ["history", "culture", "budget", "winter"],
  usa: ["adventure", "shopping", "nightlife", "family", "nature"],
  laos: ["nature", "relaxation", "adventure", "budget"],
  cambodia: ["history", "culture", "adventure", "budget"],
  sweden: ["nature", "culture", "relaxation", "winter", "luxury"],
  dubai: ["luxury", "shopping", "adventure", "nightlife", "family"],
  england: ["culture", "history", "shopping", "nightlife"],
  netherlands: ["culture", "nightlife", "family", "shopping"],
  tanzania: ["nature", "adventure", "beach", "family"],
  greece: ["beach", "romantic", "history", "food", "relaxation"],
  norway: ["nature", "adventure", "romantic", "winter", "luxury"],
  singapore: ["luxury", "shopping", "food", "family", "adventure"],
  spain: ["nightlife", "beach", "food", "culture", "romantic"],
  portugal: ["beach", "culture", "food", "relaxation", "budget"],
  france: ["romantic", "culture", "food", "shopping", "luxury"],
  korea: ["culture", "shopping", "food", "nightlife", "adventure"],
  cyprus: ["beach", "history", "relaxation", "family"],
  croatia: ["beach", "history", "relaxation", "romantic"],
  romania: ["history", "nature", "culture", "budget"],
  argentina: ["nature", "adventure", "nightlife", "culture"],
  austria: ["culture", "nature", "history", "luxury", "winter"],
  philippines: ["beach", "nature", "relaxation", "adventure", "budget"],
  // The following were real, purchasable destinations that never got a
  // vibe entry at all — scoreDestinations gave every one of them a flat 0
  // regardless of how well it actually fit, so the quiz could never
  // recommend them no matter what someone answered.
  denmark: ["culture", "nature", "family", "relaxation", "luxury"],
  estonia: ["history", "culture", "budget", "romantic"],
  hongkong: ["shopping", "food", "nightlife", "luxury", "adventure"],
  israel: ["history", "culture", "food", "beach", "nightlife"],
  latvia: ["history", "culture", "budget", "romantic"],
  lithuania: ["history", "culture", "budget", "romantic"],
  malta: ["beach", "history", "relaxation", "romantic"],
  switzerland: ["nature", "luxury", "adventure", "winter", "romantic"],
};

/**
 * For a broad, multi-region destination (a whole country, not already a
 * single-city one like prague/copenhagen/dubai/singapore), the quiz result
 * used to just name the country with nothing more specific — real trip
 * planning needs an actual city/region to book around, and which one is
 * the right pick genuinely depends on the traveler's own answers (Greece
 * for a tight budget means Crete; a bigger one opens up Mykonos), not
 * something scoreDestinations' tag-matching can infer on its own. A
 * single-city/small destination (estonia, latvia, lithuania, malta, the
 * ones already scoped to one city) has no entry here on purpose — there's
 * no "which city inside it" question to answer.
 */
const RECOMMENDED_BASE_BY_SLUG: Record<string, (answers: QuizAnswers) => string> = {
  spain: (a) => (a.vibes.includes("nightlife") && a.vibes.includes("beach") ? "איביזה" : "ברצלונה"),
  greece: (a) => (a.dailyBudget <= 80 ? "כרתים" : "מיקונוס"),
  italy: (a) => (a.vibes.includes("romantic") ? "ונציה ופירנצה" : "רומא"),
  france: (a) => (a.vibes.includes("beach") ? "ניס וההריביירה הצרפתית" : "פריז"),
  thailand: (a) =>
    a.vibes.includes("beach") || a.vibes.includes("relaxation") ? "קו סמוי ופוקט" : a.vibes.includes("budget") ? "בנגקוק וצ'אנג מאי" : "בנגקוק ופוקט",
  japan: (a) => (a.vibes.includes("culture") || a.vibes.includes("history") ? "קיוטו" : "טוקיו"),
  china: () => "בייג'ינג ושנגחאי",
  vietnam: (a) => (a.vibes.includes("nature") || a.vibes.includes("adventure") ? "מפרץ הלונג וסאפה" : "האנוי והוי אן"),
  portugal: (a) => (a.vibes.includes("beach") || a.vibes.includes("relaxation") ? "האלגרבה" : "ליסבון"),
  croatia: () => "דוברובניק וספליט",
  poland: () => "קרקוב",
  england: () => "לונדון",
  netherlands: () => "אמסטרדם",
  switzerland: (a) => (a.season === "winter" ? "צרמט ואינטרלאקן" : "לוצרן ואינטרלאקן"),
  austria: (a) => (a.season === "winter" ? "אינסברוק" : "וינה וזלצבורג"),
  norway: () => "ברגן והפיורדים המערביים",
  sweden: () => "שטוקהולם",
  denmark: () => "קופנהגן",
  korea: () => "סיאול",
  philippines: (a) => (a.vibes.includes("relaxation") ? "פלאוואן" : "מנילה ופלאוואן"),
  cyprus: (a) => (a.vibes.includes("nightlife") ? "איה נאפה" : "פאפוס"),
  romania: () => "בוקרשט וברשוב",
  argentina: () => "בואנוס איירס",
  tanzania: (a) => (a.vibes.includes("beach") ? "זנזיבר" : "ספארי בסרנגטי"),
  israel: (a) => (a.vibes.includes("beach") || a.vibes.includes("nightlife") ? "תל אביב" : "ירושלים ותל אביב"),
  cambodia: () => "סיאם ריפ",
  laos: () => "לואנג פראבאנג",
};

export function recommendedBaseFor(slug: string, answers: QuizAnswers): string | null {
  return RECOMMENDED_BASE_BY_SLUG[slug]?.(answers) ?? null;
}

export type QuizAnswers = {
  vibes: VibeTag[];
  tripDays: number;
  party: "solo" | "couple" | "family" | "friends";
  season: "summer" | "winter" | "spring" | "fall";
  dailyBudget: number;
};

const SEASON_BOOST: Record<QuizAnswers["season"], VibeTag[]> = {
  winter: ["winter"],
  summer: ["beach"],
  spring: ["culture", "nature"],
  fall: ["culture", "history"],
};

const PARTY_BOOST: Record<QuizAnswers["party"], VibeTag[]> = {
  family: ["family"],
  couple: ["romantic"],
  friends: ["nightlife", "adventure"],
  solo: ["culture", "adventure"],
};

export function scoreDestinations(
  slugs: string[],
  answers: QuizAnswers
): { slug: string; score: number }[] {
  const seasonBoost = SEASON_BOOST[answers.season] ?? [];
  const partyBoost = PARTY_BOOST[answers.party] ?? [];
  const budgetBoost: VibeTag[] = answers.dailyBudget <= 60 ? ["budget"] : answers.dailyBudget >= 150 ? ["luxury"] : [];

  return slugs
    .map((slug) => {
      const tags = DESTINATION_VIBES[slug] ?? [];
      let score = 0;
      for (const tag of answers.vibes) if (tags.includes(tag)) score += 3;
      for (const tag of seasonBoost) if (tags.includes(tag)) score += 1.5;
      for (const tag of partyBoost) if (tags.includes(tag)) score += 1;
      for (const tag of budgetBoost) if (tags.includes(tag)) score += 1;
      return { slug, score };
    })
    .sort((a, b) => b.score - a.score);
}
