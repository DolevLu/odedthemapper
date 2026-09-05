// Third naming pass for Japan (see rename-japan-english.ts for the second):
// 135 of its 1025 placemarks carry a real, human-authored Hebrew title from
// the original KML (the traveler's own trip notes - "רחוב מרכזי" / "Central
// street", "Kurokawa Onsen - ספא מומלץ מאוד" / "highly recommended spa",
// etc), not a Nominatim-derived one. For English/title consistency across
// the whole destination, translate these too - only 81 distinct strings
// among the 135, so one batched Gemini call handles all of them instead of
// 135 separate round trips.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const SLUG = "japan";
const HEBREW_RE = /[֐-׿]/;

async function translateBatch(strings: string[]): Promise<Record<string, string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const body = JSON.stringify({
    system_instruction: {
      parts: [
        {
          text: `You translate short Hebrew map-pin titles (a traveler's own trip notes, e.g. street/area descriptions or a specific named place) into natural, concise English titles suitable for a travel app. Keep any proper nouns (place names already in Latin script, e.g. "Kurokawa Onsen", "Lake Ashi") as-is. Return ONLY a JSON object mapping each input string to its English translation, no extra text, no markdown. Every input key must appear in the output.`,
        },
      ],
    },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(strings) }] }],
    generationConfig: { maxOutputTokens: 8000, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
  });

  let res: Response | null = null;
  const MAX_ATTEMPTS = 12;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) break;
    if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
      const delayMs = 15000;
      console.log(`  [retry] Gemini ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS}), backing off ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    throw new Error(`Gemini request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res!.json();
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.find((p) => p.text)?.text;
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object in Gemini response: ${text}`);
  return JSON.parse(match[0]);
}

async function main() {
  const dest = await prisma.destination.findUniqueOrThrow({ where: { slug: SLUG } });

  const all = await prisma.pointOfInterest.findMany({
    where: { category: { area: { destinationId: dest.id } } },
    select: { id: true, name: true },
  });
  const hebrew = all.filter((p) => HEBREW_RE.test(p.name));
  const unique = [...new Set(hebrew.map((p) => p.name))];
  console.log(`Translating ${unique.length} unique Hebrew titles (${hebrew.length} POIs total)...`);

  const translations = await translateBatch(unique);

  const missing = unique.filter((s) => !translations[s] || typeof translations[s] !== "string");
  if (missing.length > 0) {
    throw new Error(`Gemini response missing translations for: ${JSON.stringify(missing)}`);
  }

  let updated = 0;
  for (const poi of hebrew) {
    const english = translations[poi.name];
    await prisma.pointOfInterest.update({ where: { id: poi.id }, data: { name: english } });
    updated++;
  }
  console.log(`DONE — translated and updated ${updated} POIs`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
