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
      palette: { primary: "#B5502A", secondary: "#5B6E4E", accent: "#E8B04B", background: "#FBF6EE", surface: "#FFFFFF", text: "#2B2420" },
      shape: "organic",
      mood: "Warm Mediterranean terracotta, olive, sun-bleached stone.",
    },
  },
  {
    key: "gothic-burgundy",
    label: "בורגונדי גותי",
    theme: {
      palette: { primary: "#6E2A3A", secondary: "#8A7A4E", accent: "#C9A24B", background: "#F3EDE4", surface: "#FFFFFF", text: "#231C1E" },
      shape: "sharp",
      mood: "Gothic burgundy and gold, old-world engraved elegance.",
    },
  },
  {
    key: "nordic-blue",
    label: "כחול נורדי",
    theme: {
      palette: { primary: "#3E5C76", secondary: "#C9A66B", accent: "#D97757", background: "#F5F1EA", surface: "#FFFFFF", text: "#25272B" },
      shape: "rounded",
      mood: "Hygge Scandinavian calm, dusty blue and warm wood.",
    },
  },
  {
    key: "tropical-teal",
    label: "טורקיז טרופי",
    theme: {
      palette: { primary: "#0E7C7B", secondary: "#F2542D", accent: "#FFC857", background: "#FBF8F1", surface: "#FFFFFF", text: "#1D2D2C" },
      shape: "rounded",
      mood: "Tropical saturated turquoise and coral, temple gold.",
    },
  },
  {
    key: "imperial-red",
    label: "אדום קיסרי",
    theme: {
      palette: { primary: "#A0212B", secondary: "#1B1B1B", accent: "#D4AF37", background: "#F7F1E8", surface: "#FFFFFF", text: "#1A1A1A" },
      shape: "sharp",
      mood: "Imperial red and gold, bold lacquer-and-ink confidence.",
    },
  },
  {
    key: "desert-gold",
    label: "זהב מדברי",
    theme: {
      palette: { primary: "#B08A3E", secondary: "#1B2A41", accent: "#E4C27A", background: "#F7F3E9", surface: "#FFFFFF", text: "#201C14" },
      shape: "sharp",
      mood: "Desert gold skyline, deep navy night, futuristic luxury.",
    },
  },
  {
    key: "aegean-blue",
    label: "כחול אגאי",
    theme: {
      palette: { primary: "#1B5DA8", secondary: "#2E3B4E", accent: "#E8B93D", background: "#F5F5F2", surface: "#FFFFFF", text: "#1A1E22" },
      shape: "rounded",
      mood: "Whitewashed walls, Aegean blue, sun-bleached stone.",
    },
  },
  {
    key: "forest-emerald",
    label: "ירוק יער",
    theme: {
      palette: { primary: "#1F7A4D", secondary: "#D9A441", accent: "#C1443C", background: "#F5F3E8", surface: "#FFFFFF", text: "#1E2420" },
      shape: "organic",
      mood: "Lush emerald forest, saffron light, riverside calm.",
    },
  },
];
