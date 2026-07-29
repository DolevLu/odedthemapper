import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Tip = { category: string; text: string };

const TIPS: Record<string, Tip[]> = {
  italy: [
    { category: "money", text: "המטבע הוא יורו (EUR). כרטיסי אשראי מתקבלים כמעט בכל מקום, אך כדאי מזומן קטן לשווקים ובתי קפה קטנים." },
    { category: "customs", text: "טיפ אינו חובה אך מקובל לעגל את החשבון. שימו לב ל'קופרטו' — דמי כיסוי שמופיעים בחשבון במסעדות רבות." },
    { category: "transport", text: "רוב מרכזי הערים ההיסטוריים סגורים לתנועת רכבים פרטית (ZTL) — בדקו לפני נסיעה ברכב שכור. הרכבות מקשרות בין הערים הגדולות ביעילות." },
    { category: "visa", text: "בדקו את דרישות הכניסה הרלוונטיות לדרכון שלכם מול נציגות המדינה לפני הטיסה." },
    { category: "general", text: "רוב החנויות הקטנות סוגרות לשעה-שעתיים בצהריים ('ריפוזו'). בימי ראשון חנויות רבות סגורות באזורים לא תיירותיים." },
  ],
  japan: [
    { category: "money", text: "המטבע הוא יין יפני (JPY). יפן עדיין נשענת במידה רבה על מזומן — כדאי להחזיק מזומן זמין." },
    { category: "customs", text: "טיפים אינם מקובלים ביפן ואף עלולים להיחשב מוזרים — השירות כלול תמיד במחיר." },
    { category: "transport", text: "כרטיס IC (כמו Suica/Pasmo) הופך את הנסיעה ברכבות ובאוטובוסים לקלה מאוד. הרכבות מדויקות עד הדקה." },
    { category: "visa", text: "בדקו את דרישות הכניסה הרלוונטיות לדרכון שלכם לפני הטיסה." },
    { category: "general", text: "נהוג להוריד נעליים בכניסה לבתים, מקדשים מסוימים ומסעדות עם ישיבה על טאטמי. שמירה על שקט בתחבורה הציבורית חשובה מאוד." },
  ],
  prague: [
    { category: "money", text: "המטבע הוא קורונה צ'כית (CZK) — לא היורו! שימו לב לחילופי כספים לא הוגנים ליד אתרים תיירותיים." },
    { category: "customs", text: "טיפ של כ-10% מקובל במסעדות." },
    { category: "transport", text: "התחבורה הציבורית (טראם, מטרו, אוטובוס) יעילה וזולה — כדאי כרטיס יומי אם מתכננים הרבה נסיעות." },
    { category: "visa", text: "פראג בשטח שנגן — בדקו את דרישות הכניסה הרלוונטיות לדרכון שלכם." },
    { category: "general", text: "העיר העתיקה תיירותית מאוד — מרחק קצר מהכיכר המרכזית מביא מחירי אוכל הוגנים יותר." },
  ],
  budapest: [
    { category: "money", text: "המטבע הוא פורינט הונגרי (HUF), לא היורו. שימו לב לעמלות המרה גבוהות בדוכני חילופין ברחובות הראשיים." },
    { category: "customs", text: "טיפ של כ-10% מקובל, ולעיתים כבר מתווסף אוטומטית לחשבון במסעדות — בדקו לפני שמוסיפים טיפ נוסף." },
    { category: "transport", text: "כרטיס תחבורה ציבורית משתלם מאוד לכמה ימים — הרשת כוללת מטרו, טראם ואוטובוס." },
    { category: "visa", text: "הונגריה בשטח שנגן — בדקו את דרישות הכניסה הרלוונטיות לדרכון שלכם." },
    { category: "general", text: "מרחצאות התרמיים הם חלק מרכזי מהתרבות המקומית — כדאי לתכנן זמן לביקור באחד מהם." },
  ],
  thailand: [
    { category: "money", text: "המטבע הוא באט תאילנדי (THB). מזומן עדיין נפוץ מאוד, במיוחד בשווקים ומחוץ לבנגקוק." },
    { category: "customs", text: "מיקוח בשווקים מקובל ואף מצופה. נגיעה בראש של אדם אחר נחשבת לא מנומסת." },
    { category: "transport", text: "טוקטוק ומוניות שירות נפוצים לנסיעות קצרות — סכמו מחיר מראש. הרכבת התחתית/עילית בבנגקוק יעילה ונוחה." },
    { category: "visa", text: "בדקו את דרישות הכניסה והויזה הרלוונטיות לדרכון שלכם לפני הטיסה." },
    { category: "general", text: "לבוש צנוע נדרש בכניסה למקדשים (כתפיים וברכיים מכוסות). מומלץ ביטוח בריאות/נסיעות בשל האקלים החם והלח." },
  ],
  vietnam: [
    { category: "money", text: "המטבע הוא דונג וייטנאמי (VND) — הסכומים גדולים, שימו לב לספרות." },
    { category: "customs", text: "מיקוח מקובל בשווקים. טיפ אינו חובה אך מוערך בשירותי תיירים." },
    { category: "transport", text: "חציית כביש עמוס באופנועים דורשת הליכה יציבה בקצב אחיד — אל תרוצו ואל תעצרו פתאום." },
    { category: "visa", text: "בדקו את דרישות הכניסה והויזה הרלוונטיות לדרכון שלכם לפני הטיסה." },
    { category: "general", text: "מומלץ ביטוח נסיעות מקיף. שתו רק מים מבקבוק או מסוננים." },
  ],
  copenhagen: [
    { category: "money", text: "המטבע הוא קרונה דנית (DKK), לא היורו. דנמרק כמעט חברה ללא מזומן — כרטיס אשראי מספיק כמעט בכל מקום." },
    { category: "customs", text: "טיפ אינו נהוג — השירות כלול במחיר." },
    { category: "transport", text: "אופניים הם אמצעי התחבורה המרכזי בעיר — שכירת אופניים מומלצת. התחבורה הציבורית יעילה ומסונכרנת." },
    { category: "visa", text: "דנמרק בשטח שנגן — בדקו את דרישות הכניסה הרלוונטיות לדרכון שלכם." },
    { category: "general", text: "המחירים בדנמרק גבוהים יחסית לאירופה — תכננו תקציב בהתאם." },
  ],
};

async function main() {
  for (const [slug, tips] of Object.entries(TIPS)) {
    const destination = await prisma.destination.findUnique({ where: { slug } });
    if (!destination) {
      console.log(`skip ${slug}: not found`);
      continue;
    }
    const existing = await prisma.destinationTip.count({ where: { destinationId: destination.id } });
    if (existing > 0) {
      console.log(`skip ${slug}: already has ${existing} tips`);
      continue;
    }
    await prisma.destinationTip.createMany({
      data: tips.map((t) => ({ destinationId: destination.id, category: t.category, text: t.text })),
    });
    console.log(`seeded ${tips.length} tips for ${slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
