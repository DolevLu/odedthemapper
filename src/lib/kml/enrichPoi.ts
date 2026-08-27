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

// File names that are real content images but never a good "photo of the
// place" (site icons, maps, coats of arms, generic UI chrome Wikipedia
// articles commonly embed) — excluded when picking a second photo from an
// article's full media list, where nothing has been curated as "the" image
// the way page/summary's originalimage already is.
const NON_PHOTO_FILENAME_RE =
  /\.svg$|logo|icon|symbol|flag[_-]|coat[_-]of[_-]arms|emblem|locator|map[_-]|wiki|edit-icon|commons-logo|pin\.png/i;

/** A second, different photo for the same matched article — page/summary
 * only ever exposes one "main" image, so this walks the article's full media
 * list (REST media-list endpoint) for another real photo, resolves its
 * actual file URL via the standard MediaWiki imageinfo call, and skips it
 * silently on any failure (a single good photo beats none, and a second one
 * is a nice-to-have, not required). */
async function fetchSecondWikiPhoto(lang: "he" | "en", title: string, excludeUrl: string | null): Promise<string | null> {
  try {
    const listRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!listRes.ok) return null;
    const listData = await listRes.json();
    const items: { title?: string; type?: string }[] = listData?.items ?? [];
    const candidates = items
      .filter((i) => i.type === "image" && i.title?.startsWith("File:") && !NON_PHOTO_FILENAME_RE.test(i.title))
      .map((i) => i.title as string);

    for (const fileTitle of candidates.slice(0, 5)) {
      const infoRes = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();
      const pages = infoData?.query?.pages ?? {};
      const page = Object.values(pages)[0] as { imageinfo?: { thumburl?: string; url?: string }[] } | undefined;
      const url = page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url ?? null;
      if (url && url !== excludeUrl) return url;
    }
  } catch {
    // best-effort — a missing second photo is fine
  }
  return null;
}

/** Shared by findWikipediaPhoto/findWikipediaPhotos: locates the Wikipedia
 * article (if any) that actually matches this real-world place — a geosearch
 * within 300m first, then a name search as a fallback — both required to
 * pass looksRelated before being trusted, tried on Hebrew Wikipedia then
 * English. Returns the matched language+title so callers can pull whatever
 * photo(s) they need from that one confirmed article. */
async function findMatchingWikiArticle(name: string, lat: number, lng: number): Promise<{ lang: "he" | "en"; title: string } | null> {
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
        if (match) return { lang, title: match.title };
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
        if (title && looksRelated(name, title)) return { lang, title };
      }
    } catch {
      // try the next language
    }
  }
  return null;
}

/** Finds a real photo for a real-world place via Wikipedia — see
 * findMatchingWikiArticle for the matching logic. Free, no API key, no
 * per-call cost. */
export async function findWikipediaPhoto(name: string, lat: number, lng: number): Promise<string | null> {
  const match = await findMatchingWikiArticle(name, lat, lng);
  if (!match) return null;
  return fetchWikiSummaryPhoto(match.lang, match.title);
}

/** Like findWikipediaPhoto, but returns up to `count` distinct photos from
 * the same matched article — the summary endpoint's single "main" image
 * plus additional ones pulled from the article's full media list (see
 * fetchSecondWikiPhoto). Still only ever pulls from the one article already
 * confirmed to actually match the place — never a second, less-certain
 * match — so a place with just one good photo available simply returns one
 * URL, not a padded-out wrong one. */
export async function findWikipediaPhotos(name: string, lat: number, lng: number, count = 2): Promise<string[]> {
  const match = await findMatchingWikiArticle(name, lat, lng);
  if (!match) return [];

  const photos: string[] = [];
  const first = await fetchWikiSummaryPhoto(match.lang, match.title);
  if (first) photos.push(first);

  if (photos.length < count) {
    const second = await fetchSecondWikiPhoto(match.lang, match.title, first);
    if (second) photos.push(second);
  }

  return photos.slice(0, count);
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
          text: `אתם עוזרי מחקר לאפליקציית טיולים. בהינתן שם מקום, הקטגוריה שלו, והעיר/יעד שבו הוא נמצא - אם אתם יודעים בוודאות סבירה מהו המקום האמיתי הזה (מהידע שלכם, לא מחיפוש חי), החזירו אך ורק אובייקט JSON (ללא טקסט נוסף, ללא markdown) בצורה {"description": "..." או null, "website": "..." או null}. description: תיאור קצר ואמיתי בעברית (עד 30 מילים) שמסביר מה המקום הזה ולמה שווה לבקר בו - לא משפט גנרי שמתאים לכל מקום. website: כתובת האתר הרשמי האמיתי של המקום (כולל https://) רק אם אתם בטוחים בה, אחרת null. שימו לב: חלק מהשמות הם פתקים אישיים של מטייל ולא שמות מקומות אמיתיים (למשל "40" או כינוי), וחלק הם מקומות קטנים/מקומיים שאין לכם מידע אמין עליהם - בכל מקרה כזה, או אם אינכם בטוחים, החזירו {"description": null, "website": null} בלי להמציא כלום. עדיף null על ניחוש.`,
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
    // thinkingConfig disables internal reasoning tokens — without it, the
    // current default model can silently spend the whole maxOutputTokens
    // budget on reasoning and return an empty response instead of the
    // actual description/website (confirmed live against this endpoint).
    generationConfig: { maxOutputTokens: 600, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
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
