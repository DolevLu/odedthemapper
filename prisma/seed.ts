import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { importKmlToDestination } from "../src/lib/kml/importToDb";
import { themePresets } from "../src/lib/theme/presets";
import { getPhrasebookSeedForSlug } from "../src/lib/phrasebookSeeds";

type ContinentKey = "europe" | "asia" | "africa" | "americas" | "oceania" | "middle-east";

const DESTINATIONS: {
  slug: string;
  name: string;
  tagline: string;
  themeKey: keyof typeof themePresets;
  continent: ContinentKey;
  isBestSeller?: boolean;
}[] = [
  { slug: "italy", name: "איטליה", tagline: "ארץ המגף המתויירת", themeKey: "italy", continent: "europe", isBestSeller: true },
  { slug: "prague", name: "פראג", tagline: "יעד מושלם לקיץ ולקריסמס", themeKey: "prague", continent: "europe", isBestSeller: true },
  { slug: "japan", name: "יפן", tagline: "היעד הכי טרנדי בעולם", themeKey: "japan", continent: "asia", isBestSeller: true },
  { slug: "copenhagen", name: "קופנהגן", tagline: "היעד הכי אנדררייטד", themeKey: "copenhagen", continent: "europe", isBestSeller: true },
  { slug: "budapest", name: "בודפשט", tagline: "יעד יפהפה, זול וקרוב", themeKey: "budapest", continent: "europe", isBestSeller: true },
  { slug: "thailand", name: "תאילנד", tagline: "היעד האהוב במזרח", themeKey: "thailand", continent: "asia", isBestSeller: true },
  { slug: "china", name: "סין", tagline: "היעד המפתיע ביותר", themeKey: "china", continent: "asia" },
  { slug: "vietnam", name: "ויאטנם", tagline: "טיול מזרח שלם ומקיף", themeKey: "vietnam", continent: "asia", isBestSeller: true },
  { slug: "poland", name: "פולין", tagline: "ורשה, קרקוב, גדנסק וכל השאר", themeKey: "poland", continent: "europe" },
  { slug: "usa", name: "ארהב", tagline: "רואד טריפ אמריקאי קלאסי", themeKey: "usa", continent: "americas" },
  { slug: "laos", name: "לאוס", tagline: "טבע בתולי ורוגע בין מקדשים ונהרות", themeKey: "laos", continent: "asia" },
  { slug: "cambodia", name: "קמבודיה", tagline: "אנגקור וואט והיסטוריה שחיה בין העצים", themeKey: "cambodia", continent: "asia" },
  { slug: "sweden", name: "שבדיה", tagline: "עיצוב סקנדינבי, אגמים וערים שקטות", themeKey: "sweden", continent: "europe" },
  { slug: "dubai", name: "דובאי", tagline: "שמיים גורדי עננים, מדבר וזוהר בלתי נגמר", themeKey: "dubai", continent: "middle-east" },
  { slug: "england", name: "אנגליה", tagline: "לונדון, טירות ואווירה בריטית קלאסית", themeKey: "england", continent: "europe" },
  { slug: "netherlands", name: "הולנד", tagline: "תעלות, אופניים ושדות צבעוניים", themeKey: "netherlands", continent: "europe" },
  { slug: "tanzania", name: "טנזניה וזנזיבר", tagline: "ספארי אפריקאי וחופים טרופיים", themeKey: "tanzania", continent: "africa" },
  { slug: "greece", name: "יוון", tagline: "איים כחולים-לבנים ואוכל ים תיכוני", themeKey: "greece", continent: "europe" },
  { slug: "norway", name: "נורבגיה", tagline: "פיורדים דרמטיים וטבע פראי", themeKey: "norway", continent: "europe" },
  { slug: "singapore", name: "סינגפור", tagline: "עיר-מדינה מודרנית עם טעם אסייתי", themeKey: "singapore", continent: "asia" },
  { slug: "spain", name: "ספרד", tagline: "פלמנקו, טאפאס וחיי לילה תוססים", themeKey: "spain", continent: "europe" },
  { slug: "portugal", name: "פורטוגל", tagline: "חופים, אזוליז'וס ואווירה נינוחה", themeKey: "portugal", continent: "europe" },
  { slug: "france", name: "צרפת", tagline: "פריז, יין וקסם אירופאי קלאסי", themeKey: "france", continent: "europe" },
  { slug: "korea", name: "קוריאה", tagline: "טכנולוגיה, K-פופ ותרבות עתיקה", themeKey: "korea", continent: "asia" },
  { slug: "cyprus", name: "קפריסין", tagline: "חופים תכולים והיסטוריה ים תיכונית", themeKey: "cyprus", continent: "europe" },
  { slug: "croatia", name: "קרואטיה", tagline: "חופי אדריאטיק ועיירות מוקפות חומה", themeKey: "croatia", continent: "europe" },
  { slug: "romania", name: "רומניה", tagline: "טירות בקרפטים ואגדות טרנסילבניה", themeKey: "romania", continent: "europe" },
  { slug: "argentina", name: "ארגנטינה", tagline: "טנגו, פטגוניה וקסם בואנוס איירס", themeKey: "argentina", continent: "americas" },
  { slug: "austria", name: "אוסטריה", tagline: "האלפים, וינה הקיסרית ומוזיקה קלאסית", themeKey: "austria", continent: "europe" },
  { slug: "philippines", name: "הפיליפינים", tagline: "אלפי איים, חופים טרופיים וצלילה עולמית", themeKey: "philippines", continent: "asia" },
];

const KML_DESTINATIONS = [
  "italy", "prague", "copenhagen", "japan",
  "budapest", "thailand", "china", "vietnam", "poland",
  "laos", "cambodia", "sweden", "dubai", "england", "netherlands",
  "tanzania", "greece", "norway", "singapore", "spain", "portugal",
  "france", "korea", "cyprus", "croatia", "romania", "argentina",
  "austria", "philippines",
];

// Real partner benefits from odedthemapper.com/coupons — apply to every destination.
const GLOBAL_COUPONS = [
  {
    partnerName: "Holafly",
    discountDesc: "5% הנחה על eSIM לאינטרנט בחו״ל בלי צורך בסים פיזי.",
    url: "http://rwrd.io/f0zt51s",
  },
  {
    partnerName: "Klook",
    discountDesc: "הזמנת אטרקציות, סיורים, תחבורה וכרטיסים ברחבי העולם — לעיתים במחיר טוב יותר ובלי לחכות בתור.",
    url: "https://klook.tpo.lv/ieXtbiWP",
  },
  {
    partnerName: "ביטוח נסיעות (סוכן הביטוח של עודד המנקד)",
    discountDesc: "ביטוח נסיעות לחו״ל במחירים תחרותיים עם ליווי אישי.",
    url: "https://buy.passportcard.co.il/?AffiliateId=6IULeHdTlwCep2R9tqqd0A%3D%3D",
  },
  {
    partnerName: "Eatwith",
    discountDesc: "התחברות למארחים מקומיים לארוחות בית, סדנאות בישול וחוויות קולינריות.",
    url: "https://eatwith.tpo.lv/KXBes9lD",
  },
  {
    partnerName: "EastCard",
    discountDesc: "50% הנחה על כרטיס ההנחות של EastCard — מאות הנחות באטרקציות במזרח.",
    url: "https://eastcardil.co.il/",
  },
  {
    partnerName: "יפנית עם עמליה",
    discountDesc: "קורס דיגיטלי ללימוד יפנית בסיסית, מותאם להכנה לטיול ביפן.",
    url: "https://japanesewithamalia.ravpage.co.il/Japanese%20with%20Amalia",
  },
];

async function main() {
  const adminEmail = "oded.the.mapper@gmail.com";
  const adminPasswordHash = await bcrypt.hash("changeme-admin-password", 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isAdmin: true },
    create: { email: adminEmail, name: "Oded Admin", isAdmin: true, passwordHash: adminPasswordHash },
  });
  console.log(`Admin user ready: ${adminEmail}`);

  for (const dest of DESTINATIONS) {
    const theme = themePresets[dest.themeKey];
    await prisma.destination.upsert({
      where: { slug: dest.slug },
      update: {
        name: dest.name,
        tagline: dest.tagline,
        themeConfig: JSON.stringify(theme),
        continent: dest.continent,
        isBestSeller: dest.isBestSeller ?? false,
      },
      create: {
        slug: dest.slug,
        name: dest.name,
        tagline: dest.tagline,
        status: "draft",
        themeConfig: JSON.stringify(theme),
        continent: dest.continent,
        isBestSeller: dest.isBestSeller ?? false,
      },
    });
  }
  console.log(`Seeded ${DESTINATIONS.length} destinations.`);

  const existingGlobalCoupons = await prisma.coupon.count({ where: { destinationId: null } });
  if (existingGlobalCoupons === 0) {
    await prisma.coupon.createMany({ data: GLOBAL_COUPONS.map((c) => ({ ...c, destinationId: null })) });
    console.log(`Seeded ${GLOBAL_COUPONS.length} global coupons.`);
  } else {
    console.log("Global coupons already seeded, skipping.");
  }

  for (const slug of KML_DESTINATIONS) {
    const destination = await prisma.destination.findUniqueOrThrow({ where: { slug } });
    const existingImport = await prisma.kmlImport.findFirst({ where: { destinationId: destination.id } });

    if (existingImport) {
      console.log(`${slug}: KML already imported, skipping.`);
      continue;
    }

    const xml = readFileSync(join(__dirname, "..", "fixtures", "kml", `${slug}.kml`), "utf-8");
    const result = await importKmlToDestination(prisma, destination.id, `${slug}.kml`, xml);

    const seed = getPhrasebookSeedForSlug(slug);
    if (seed.length > 0) {
      await prisma.phrasebookEntry.createMany({ data: seed.map((p) => ({ destinationId: destination.id, ...p })) });
    }

    await prisma.destination.update({ where: { id: destination.id }, data: { status: "preview" } });
    console.log(
      `Imported ${slug} KML: ${result.areasCreated} areas, ${result.categoriesCreated} categories, ${result.poisCreated} POIs, ${seed.length} phrasebook entries.`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
