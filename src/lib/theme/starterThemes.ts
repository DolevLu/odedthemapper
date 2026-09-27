import type { ThemeConfig } from "./types";

/** A small curated set of ready-made theme directions offered when creating
 * a new destination in the admin panel — every destination is meant to have
 * its own visual identity (see theme/presets.ts for the full per-destination
 * set already in use), but nothing generates one automatically yet, so the
 * admin picks a starting point here and can hand-tune it later. */
export type StarterTheme = { key: string; label: string; theme: ThemeConfig };

export const STARTER_THEMES: StarterTheme[] = [
  {
    key: "warm-terracotta",
    label: "טרקוטה חמה",
    theme: {
      palette: { primary: "#7C3AED", secondary: "#C4B5FD", accent: "#EC4899", background: "#FBF9FF", surface: "#FFFFFF", text: "#2B2420" },
      shape: "organic",
      mood: "Warm Mediterranean terracotta, olive, sun-bleached stone.",
    },
  },
  {
    key: "gothic-burgundy",
    label: "בורגונדי גותי",
    theme: {
      palette: { primary: "#8B5CF6", secondary: "#DDD6FE", accent: "#F472B6", background: "#FBF9FF", surface: "#FFFFFF", text: "#231C1E" },
      shape: "sharp",
      mood: "Gothic burgundy and gold, old-world engraved elegance.",
    },
  },
  {
    key: "nordic-blue",
    label: "כחול נורדי",
    theme: {
      palette: { primary: "#6D28D9", secondary: "#A78BFA", accent: "#DB2777", background: "#FBF9FF", surface: "#FFFFFF", text: "#25272B" },
      shape: "rounded",
      mood: "Hygge Scandinavian calm, dusty blue and warm wood.",
    },
  },
  {
    key: "tropical-teal",
    label: "טורקיז טרופי",
    theme: {
      palette: { primary: "#9F75E8", secondary: "#E9D5FF", accent: "#F0ABFC", background: "#FBF9FF", surface: "#FFFFFF", text: "#1D2D2C" },
      shape: "rounded",
      mood: "Tropical saturated turquoise and coral, temple gold.",
    },
  },
  {
    key: "imperial-red",
    label: "אדום קיסרי",
    theme: {
      palette: { primary: "#7E22CE", secondary: "#D8B4FE", accent: "#E879F9", background: "#FBF9FF", surface: "#FFFFFF", text: "#1A1A1A" },
      shape: "sharp",
      mood: "Imperial red and gold, bold lacquer-and-ink confidence.",
    },
  },
  {
    key: "desert-gold",
    label: "זהב מדברי",
    theme: {
      palette: { primary: "#A78BFA", secondary: "#C4B5FD", accent: "#F9A8D4", background: "#FBF9FF", surface: "#FFFFFF", text: "#201C14" },
      shape: "sharp",
      mood: "Desert gold skyline, deep navy night, futuristic luxury.",
    },
  },
  {
    key: "aegean-blue",
    label: "כחול אגאי",
    theme: {
      palette: { primary: "#6B46C1", secondary: "#B4A7F5", accent: "#EC4899", background: "#FBF9FF", surface: "#FFFFFF", text: "#1A1E22" },
      shape: "rounded",
      mood: "Whitewashed walls, Aegean blue, sun-bleached stone.",
    },
  },
  {
    key: "forest-emerald",
    label: "ירוק יער",
    theme: {
      palette: { primary: "#9333EA", secondary: "#E9D5FF", accent: "#F472B6", background: "#FBF9FF", surface: "#FFFFFF", text: "#1E2420" },
      shape: "organic",
      mood: "Lush emerald forest, saffron light, riverside calm.",
    },
  },
];
