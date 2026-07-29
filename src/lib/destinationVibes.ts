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
};

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
