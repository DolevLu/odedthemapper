/** A short singular Hebrew accessibility label from a POI's (often plural/
 * folder-style, e.g. "מסעדות") category name — so a display like "מסעדה ·
 * Café Savoy" makes clear what kind of place it is before the (often
 * English) venue name, without needing a photo to tell restaurant from bar
 * from attraction. Falls back to the category name itself when nothing
 * matches, never to something empty. */
const PATTERNS: [RegExp, string][] = [
  [/מסעד/, "מסעדה"],
  [/קפה|בראנץ/, "בית קפה"],
  [/^בר|ברים|בר\b/, "בר"],
  [/לילה|מועדונ|מסיב/, "מועדון לילה"],
  [/מוזיאון/, "מוזיאון"],
  [/גלריה/, "גלריה"],
  [/פארק/, "פארק"],
  [/תצפית/, "נקודת תצפית"],
  [/חוף/, "חוף"],
  [/שופינג|קניון|שוק/, "קניה"],
  [/מקדש|וואט|wat\b/i, "מקדש"],
  [/כנסיי|קתדרל/, "כנסייה"],
  [/ארמון|טירה/, "ארמון"],
  [/שייט|קרוז/, "שייט"],
  [/סיור/, "סיור מודרך"],
  [/עיר|עיירה/, "עיר"],
  [/מטרו|רכבת|תחב/, "תחבורה"],
  [/אטרקצי/, "אטרקציה"],
];

export function shortCategoryLabel(categoryName: string): string {
  for (const [pattern, label] of PATTERNS) {
    if (pattern.test(categoryName)) return label;
  }
  return categoryName;
}
