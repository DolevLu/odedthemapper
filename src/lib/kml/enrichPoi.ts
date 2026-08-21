// Pure-AI/free-data enrichment for POIs whose KML data is missing or
// generic (a boilerplate description + the same stock photo repeated across
// every placemark, which is what some KML export/generator tools produce
// instead of real per-place content — confirmed directly against a real
// uploaded file, which also turned out to be full of a real traveler's
// personal notes-as-pin-names rather than real venue names, e.g. "40" or a
// whole sentence like "looks like an interesting square, not sure what's
// here" — handled explicitly below, not just an edge case). No paid APIs:
// photos come from Wikipedia/Wikimedia (free, no key); descriptions/
// websites come from Gemini's own trained knowledge (see
// generateDescriptionAndWebsite for why not live Google Search grounding).

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

// Generic category/geography nouns — common enough that two *unrelated*
// places will often both happen to use one ("כיכר" appearing in both a
// personal note and a totally different real square's Wikipedia title was
// enough to trigger a wrong photo match before this was excluded). Real
// matches need to agree on something more specific than this.
const GENERIC_WORDS = new Set([
  "כיכר", "חוף", "פארק", "גן", "רחוב", "שביל", "נוף", "אזור", "מקום", "נקודה",
  "מרכז", "מסעדה", "בית", "קפה", "בר", "מוזיאון", "שוק", "מצפור", "טיילת",
]);

/** Many of a real user's KML pins are personal notes, not real named venues
 * — a bare number, a nickname, or a whole descriptive sentence ("looks like
 * an interesting square, not sure what's here"). There's nothing real to
 * look up or verify a match against for any of these, so skip lookups
 * entirely rather than risk attaching a random nearby/generically-matching
 * article's photo to something that isn't really a place name at all. */
function looksLikeARealName(name: string): boolean {
  const n = normalize(name);
  if (n.length < 3) return false;
  if (/^\d+$/.test(n)) return false;
  const wordCount = n.split(/\s+/).filter(Boolean).length;
  if (wordCount > 5) return false; // real place names run 1-5 words; longer reads as a sentence/note
  return true;
}

/** At least one *specific* word (3+ chars, not a generic category/geography
 * noun — see GENERIC_WORDS) has to be shared between the POI name and the
 * Wikipedia candidate title, in either direction — guards against attaching
 * an unrelated nearby article's photo just because it happened to be the
 * closest geosearch result, or because both mention "square"/"beach"/etc.
 * without actually being the same place. A wrong photo is worse than no
 * photo. */
function looksRelated(poiName: string, candidateTitle: string): boolean {
  const nameWords = normalize(poiName)
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
  const titleWords = normalize(candidateTitle)
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
  return nameWords.some((w) => titleWords.some((t) => t.includes(w) || w.includes(t)));
}

async function fetchWikiSummaryPhoto(lang: "he" | "en", title: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

/** Finds a real photo for a real-world place via Wikipedia: a geosearch
 * within 300m first, then a name search as a fallback — both require the
 * candidate article's title to actually relate to the POI's name (proximity
 * alone isn't trusted; see looksRelated) before its photo is used. Tries
 * Hebrew Wikipedia first, then English. Free, no API key, no per-call cost.
 * Skips entirely for names that don't look like real place names to begin
 * with (see looksLikeARealName) — nothing to verify a match against. */
export async function findWikipediaPhoto(name: string, lat: number, lng: number): Promise<string | null> {
  if (!looksLikeARealName(name)) return null;

  for (const lang of ["he", "en"] as const) {
    try {
      const geoRes = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lng}&gsradius=300&gslimit=5&format=json`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const candidates: { title: string }[] = geoData?.query?.geosearch ?? [];
        const match = candidates.find((c) => looksRelated(name, c.title));
        if (match) {
          const photo = await fetchWikiSummaryPhoto(lang, match.title);
          if (photo) return photo;
        }
      }
    } catch {
      // try the next language / fall through to name search
    }

    try {
      const searchRes = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=1`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const title: string | undefined = searchData?.query?.search?.[0]?.title;
        if (title && looksRelated(name, title)) {
          const photo = await fetchWikiSummaryPhoto(lang, title);
          if (photo) return photo;
        }
      }
    } catch {
      // try the next language
    }
  }
  return null;
}

export type PoiEnrichment = { description: string | null; website: string | null };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Asks Gemini for a real short description and the place's real official
 * website, from its own trained knowledge — NOT live-grounded search: the
 * "Google Search" grounding tool was tried first and dropped after testing
 * confirmed this API key's quota for it is essentially zero (consistent 429
 * RESOURCE_EXHAUSTED even solo, with backoff, while a plain call succeeds
 * immediately) — grounding effectively needs a billing-enabled project,
 * which conflicts with "no paid APIs." Plain calls use the same quota the
 * rest of the app's Gemini features already run on in production.
 *
 * This means real but obscure/very local/very new places the model never
 * saw during training legitimately won't be found — explicitly instructed
 * to return null rather than invent a plausible-sounding answer, since a
 * wrong website link is worse than no link. */
export async function generateDescriptionAndWebsite(
  name: string,
  categoryName: string,
  areaName: string,
  destinationName: string,
  lat: number,
  lng: number
): Promise<PoiEnrichment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !looksLikeARealName(name)) return { description: null, website: null };

  const body = JSON.stringify({
    system_instruction: {
      parts: [
        {
          text: `אתם עוזרי מחקר לאפליקציית טיולים. בהינתן שם מקום, הקטגוריה שלו, והעיר/יעד שבו הוא נמצא — אם אתם יודעים בוודאות סבירה מהו המקום האמיתי הזה (מהידע שלכם, לא מחיפוש חי), החזירו אך ורק אובייקט JSON (ללא טקסט נוסף, ללא markdown) בצורה {"description": "..." או null, "website": "..." או null}. description: תיאור קצר ואמיתי בעברית (עד 30 מילים) שמסביר מה המקום הזה ולמה שווה לבקר בו — לא משפט גנרי שמתאים לכל מקום. website: כתובת האתר הרשמי האמיתי של המקום (כולל https://) רק אם אתם בטוחים בה, אחרת null. שימו לב: חלק מהשמות הם פתקים אישיים של מטייל ולא שמות מקומות אמיתיים (למשל "40" או כינוי), וחלק הם מקומות קטנים/מקומיים שאין לכם מידע אמין עליהם — בכל מקרה כזה, או אם אינכם בטוחים, החזירו {"description": null, "website": null} בלי להמציא כלום. עדיף null על ניחוש.`,
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `מקום: "${name}", קטגוריה: ${categoryName}, אזור: ${areaName}, יעד: ${destinationName}, קואורדינטות בקירוב: ${lat}, ${lng}`,
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 600, temperature: 0.2 },
  });

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(30000) }
      );
      if (res.status === 429 || res.status === 503) {
        if (attempt === 0) {
          await sleep(4000);
          continue;
        }
        return { description: null, website: null };
      }
      if (!res.ok) return { description: null, website: null };

      const data = await res.json();
      const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.find((p) => p.text)?.text;
      const match = text?.match(/\{[\s\S]*\}/);
      if (!match) return { description: null, website: null };
      const parsed = JSON.parse(match[0]);
      return {
        description: typeof parsed.description === "string" && parsed.description.trim() ? parsed.description.trim() : null,
        website: typeof parsed.website === "string" && /^https?:\/\//.test(parsed.website.trim()) ? parsed.website.trim() : null,
      };
    } catch {
      if (attempt === 0) {
        await sleep(2000);
        continue;
      }
      return { description: null, website: null };
    }
  }
  return { description: null, website: null };
}
