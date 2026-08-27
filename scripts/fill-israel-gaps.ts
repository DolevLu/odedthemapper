// Israel was the launch audit's worst-off destination: no hero image, no
// tips, no quiz (fixed separately in seed-quiz-manual.ts). Phrasebook is
// deliberately skipped — the app itself is in Hebrew, so a Hebrew->local-
// language phrasebook doesn't apply the way it does for other destinations.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const TIPS: { category: string; text: string }[] = [
  { category: "money", text: "המטבע הוא שקל חדש (₪, ILS) — כרטיסי אשראי מתקבלים כמעט בכל מקום, אך שווה מזומן קטן לשווקים ולדוכני רחוב." },
  { category: "customs", text: "בשישי אחה\"צ ובשבת חנויות, תחבורה ציבורית ומסעדות רבות (בעיקר מחוץ לתל אביב) סגורות עד מוצאי שבת — תכננו מראש." },
  { category: "transport", text: "רב-קו הוא כרטיס התחבורה הציבורית הארצי (אוטובוס, רכבת, רכבת קלה) — משתלם וקל יותר מרכישת כרטיסים בודדים." },
  { category: "visa", text: "אזרחי מדינות רבות (כולל רוב אירופה, ארה\"ב וקנדה) לא זקוקים לוויזה מראש לביקור קצר — בדקו את הדרישות הספציפיות לדרכון שלכם." },
  { category: "general", text: "מזג האוויר משתנה מאוד בין אזורים באותו יום — ים המלח וים סוף חמים משמעותית מירושלים ומהצפון, גם באותה עונה." },
];

async function findHeroImage(): Promise<string | null> {
  try {
    const res = await fetch("https://he.wikipedia.org/api/rest_v1/page/summary/ישראל", { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const dest = await prisma.destination.findUniqueOrThrow({ where: { slug: "israel" } });

  const existingTips = await prisma.destinationTip.count({ where: { destinationId: dest.id } });
  if (existingTips === 0) {
    await prisma.destinationTip.createMany({ data: TIPS.map((t) => ({ destinationId: dest.id, ...t })) });
    console.log(`created ${TIPS.length} tips`);
  } else {
    console.log(`already has ${existingTips} tips, skipping`);
  }

  if (!dest.heroImage) {
    const heroImage = await findHeroImage();
    if (heroImage) {
      await prisma.destination.update({ where: { id: dest.id }, data: { heroImage } });
      console.log("set hero image:", heroImage);
    } else {
      console.log("could not find a hero image via Wikipedia");
    }
  } else {
    console.log("already has a hero image, skipping");
  }
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
