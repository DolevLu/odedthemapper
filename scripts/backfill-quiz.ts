// Fills the launch-audit finding that 11 of 30 destinations had zero quiz
// questions — the whole "🧠 חידונים" screen was empty for them. Generates
// real trivia via Gemini (own trained knowledge, not live search — same
// constraint as enrichPoi.ts's description generation), explicitly
// restricted to well-established facts, matching the existing hand-written
// questions' format/style/language (see a Prague sample checked before
// writing this).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const CATEGORIES = ["history", "geography", "politics", "sports", "culture", "food"] as const;
const PER_CATEGORY = 4;

type RawQuestion = { category: string; question: string; options: string[]; correctIndex: number };

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

function isValidQuestion(q: unknown): q is RawQuestion {
  if (!q || typeof q !== "object") return false;
  const r = q as Record<string, unknown>;
  return (
    typeof r.category === "string" &&
    (CATEGORIES as readonly string[]).includes(r.category) &&
    typeof r.question === "string" &&
    r.question.trim().length > 0 &&
    Array.isArray(r.options) &&
    r.options.length === 4 &&
    r.options.every((o) => typeof o === "string" && o.trim().length > 0) &&
    typeof r.correctIndex === "number" &&
    Number.isInteger(r.correctIndex) &&
    r.correctIndex >= 0 &&
    r.correctIndex <= 3
  );
}

async function generateQuestions(destinationName: string): Promise<RawQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const body = JSON.stringify({
    system_instruction: {
      parts: [
        {
          text: `אתם כותבי טריוויה לאפליקציית טיולים. בהינתן שם יעד/מדינה, כתבו ${PER_CATEGORY} שאלות טריוויה אמיתיות ומדויקות לכל אחת מהקטגוריות: history, geography, politics, sports, culture, food (סה"כ ${PER_CATEGORY * CATEGORIES.length} שאלות). כללים: רק עובדות ידועות ומבוססות היטב שאתם בטוחים בהן במאה אחוז — אם אינכם בטוחים בעובדה, אל תכתבו עליה שאלה בכלל. כל שאלה: 4 תשובות אפשריות (options) בעברית, תשובה נכונה אחת (correctIndex, אינדקס 0-3). שאלות ברמת קושי בינונית-קלה, מעניינות למטייל סקרן, לא מסובכות מדי. החזירו אך ורק מערך JSON תקין (ללא markdown, ללא טקסט נוסף) של אובייקטים בצורה: {"category": "...", "question": "...", "options": ["...","...","...","..."], "correctIndex": 0}`,
        },
      ],
    },
    contents: [{ role: "user", parts: [{ text: `יעד: ${destinationName}` }] }],
    generationConfig: { maxOutputTokens: 4000, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
  });

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(45000),
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
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidQuestion);
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
      () => prisma.quizQuestion.count({ where: { destinationId: dest.id } }),
      `${dest.slug}: count existing`
    );
    if (existing > 0) {
      console.log(`${dest.slug}: already has ${existing} questions, skipping`);
      continue;
    }

    const questions = await generateQuestions(dest.name);
    if (questions.length === 0) {
      console.log(`${dest.slug}: Gemini returned nothing usable`);
      continue;
    }

    await withRetry(
      () =>
        prisma.quizQuestion.createMany({
          data: questions.map((q) => ({
            destinationId: dest.id,
            category: q.category,
            question: q.question,
            options: JSON.stringify(q.options),
            correctIndex: q.correctIndex,
          })),
        }),
      `${dest.slug}: insert questions`
    );
    console.log(`${dest.slug}: created ${questions.length} questions`);
  }
  console.log("DONE");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
