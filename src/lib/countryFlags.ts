export const COUNTRY_BY_SLUG: Record<string, { flag: string; name: string }> = {
  italy: { flag: "🇮🇹", name: "איטליה" },
  prague: { flag: "🇨🇿", name: "צ׳כיה" },
  japan: { flag: "🇯🇵", name: "יפן" },
  copenhagen: { flag: "🇩🇰", name: "דנמרק" },
  budapest: { flag: "🇭🇺", name: "הונגריה" },
  thailand: { flag: "🇹🇭", name: "תאילנד" },
  china: { flag: "🇨🇳", name: "סין" },
  vietnam: { flag: "🇻🇳", name: "ויאטנם" },
  poland: { flag: "🇵🇱", name: "פולין" },
  usa: { flag: "🇺🇸", name: "ארה״ב" },
};

/** Maps a destination slug to the ISO alpha-2 code used by WORLD_COUNTRIES —
 * lets Album photos uploaded for a destination auto-surface on that
 * country's pin on the visited-countries world map. */
export const COUNTRY_CODE_BY_SLUG: Record<string, string> = {
  italy: "IT",
  prague: "CZ",
  japan: "JP",
  copenhagen: "DK",
  budapest: "HU",
  thailand: "TH",
  china: "CN",
  vietnam: "VN",
  poland: "PL",
  usa: "US",
};
