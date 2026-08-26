// Fills the "worth booking in advance" gap found in the launch audit: 24 of
// 30 destinations had zero wantsBooking POIs, meaning the whole "🎟️ להזמנה"
// screen and the Now screen's "לזכור להזמין" section were empty for them.
// Uses Gemini to pick real candidates from each destination's own actual POI
// list (never invents new places) — the same quality bar Prague's existing
// 5 hand-set items show: ticketed attractions/towers, unique paid
// experiences, tours/cruises, and restaurants worth reserving ahead.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const MIN_TARGET = 5;
const CANDIDATE_TAKE = 220;

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      const delayMs = 1500 * i;
      console.log(`  [retry] ${label} (attempt ${i}/${attempts}): ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("unreachable");
}

async function pickBookable(destinationName: string, candidates: { name: string; category: string }[]): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const body = JSON.stringify({
    system_instruction: {
      parts: [
        {
          text: `אתם עוזרי תכנון טיולים. בהינתן שם יעד ורשימת מקומות אמיתיים בו (שם + קטגוריה), בחרו עד 5 מקומות שממש כדאי להזמין/לשריין מראש — אטרקציות עם כרטיסים (מגדלי תצפית, מוזיאונים גדולים, חוויות ייחודיות בתשלום), סיורים מודרכים, שייטים/קרוזים, או מסעדות פופולריות שדורשות הזמנת מקום. אל תבחרו קפיטריות/ברים רגילים סתם. החזירו אך ורק מערך JSON של שמות מדויקים מתוך הרשימה שניתנה (העתק-הדבק מדויק של השם), ללא טקסט נוסף. אם שום דבר ברשימה לא מתאים באמת, החזירו מערך ריק.`,
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `יעד: ${destinationName}\nרשימת מקומות:\n${candidates.map((c) => `- ${c.name} (${c.category})`).join("\n")}` }],
      },
    ],
    generationConfig: { maxOutputTokens: 500, temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
  });

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429 || res.status === 503) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        return [];
      }
      if (!res.ok) return [];
      const data = await res.json();
      const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.find((p) => p.text)?.text;
      const match = text?.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string") : [];
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return [];
    }
  }
  return [];
}

async function main() {
  const destinations = await withRetry(
    () => prisma.destination.findMany({ where: { status: { not: "draft" } }, select: { id: true, name: true, slug: true } }),
    "list destinations"
  );

  for (const dest of destinations) {
    const existing = await withRetry(
      () => prisma.pointOfInterest.count({ where: { wantsBooking: true, category: { area: { destinationId: dest.id } } } }),
      `${dest.slug}: count existing`
    );
    if (existing >= MIN_TARGET) {
      console.log(`${dest.slug}: already has ${existing}, skipping`);
      continue;
    }

    const candidates = await withRetry(
      () =>
        prisma.pointOfInterest.findMany({
          where: { geometryType: "point", wantsBooking: false, category: { area: { destinationId: dest.id } } },
          select: { id: true, name: true, category: { select: { name: true } } },
          take: CANDIDATE_TAKE,
        }),
      `${dest.slug}: fetch candidates`
    );
    if (candidates.length === 0) {
      console.log(`${dest.slug}: no candidates at all, skipping`);
      continue;
    }

    const picked = await pickBookable(
      dest.name,
      candidates.map((c) => ({ name: c.name, category: c.category.name }))
    );
    const byName = new Map(candidates.map((c) => [c.name, c.id]));
    const matchedIds = picked.map((name) => byName.get(name)).filter((id): id is string => Boolean(id));

    if (matchedIds.length === 0) {
      console.log(`${dest.slug}: Gemini returned nothing usable`);
      continue;
    }

    await withRetry(
      () => prisma.pointOfInterest.updateMany({ where: { id: { in: matchedIds } }, data: { wantsBooking: true } }),
      `${dest.slug}: flag bookable`
    );
    console.log(`${dest.slug}: flagged ${matchedIds.length} — ${picked.join(", ")}`);
  }
  console.log("DONE");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
