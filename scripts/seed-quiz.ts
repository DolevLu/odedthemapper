import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Q = { category: string; question: string; options: [string, string, string, string]; correctIndex: number };

const QUESTIONS: Record<string, Q[]> = {
  italy: [
    { category: "geography", question: "מהו הנהר הארוך ביותר באיטליה?", options: ["הפו", "הטיבר", "הארנו", "האדיג'ה"], correctIndex: 0 },
    { category: "history", question: "מי היה הקיסר הרומי הראשון?", options: ["יוליוס קיסר", "אוגוסטוס", "נירון", "קונסטנטינוס"], correctIndex: 1 },
    { category: "politics", question: "מהי צורת השלטון הנוכחית באיטליה?", options: ["מונרכיה חוקתית", "רפובליקה נשיאותית", "רפובליקה פרלמנטרית", "פדרציה"], correctIndex: 2 },
    { category: "sports", question: "כמה פעמים זכתה נבחרת איטליה במונדיאל בכדורגל?", options: ["2", "3", "4", "5"], correctIndex: 2 },
    { category: "culture", question: "באיזו עיר איטלקית נולדה הפיצה?", options: ["רומא", "נאפולי", "מילאנו", "פירנצה"], correctIndex: 1 },
    { category: "geography", question: "מה שמו של הר הגעש הפעיל הסמוך לנאפולי?", options: ["אטנה", "וזוב", "סטרומבולי", "וולקנו"], correctIndex: 1 },
    { category: "history", question: "איזו עיר הייתה לבירתה האחרונה של האימפריה הרומית המערבית?", options: ["רומא", "מילאנו", "רוונה", "נאפולי"], correctIndex: 2 },
    { category: "food", question: "איזה מאכל איטלקי מסורתי מבוסס על בצק תפוחי אדמה?", options: ["ראביולי", "טורטליני", "ניוקי", "לזניה"], correctIndex: 2 },
    { category: "culture", question: "מי צייר את תקרת הקפלה הסיסטינית?", options: ["רפאל", "מיכלאנג'לו", "ליאונרדו דה וינצ'י", "בוטיצ'לי"], correctIndex: 1 },
    { category: "geography", question: "אילו שני איים גדולים שייכים לאיטליה?", options: ["סיציליה וסרדיניה", "קורסיקה ומיורקה", "כרתים ורודוס", "מלטה וקפרי"], correctIndex: 0 },
  ],
  japan: [
    { category: "geography", question: "מהו ההר הגבוה ביותר ביפן?", options: ["פוג'י", "טאטה", "הקוסאן", "אסו"], correctIndex: 0 },
    { category: "history", question: "מהי תקופת השלטון הצבאי שנמשכה עד 1868 ונקראת על שם השוגונים?", options: ["תקופת הייאן", "תקופת אדו", "תקופת מייג'י", "תקופת נארה"], correctIndex: 1 },
    { category: "politics", question: "מהו תפקידו הרשמי של הקיסר היפני כיום?", options: ["ראש ממשלה", "סמל המדינה בלבד", "מפקד הצבא", "יו״ר הפרלמנט"], correctIndex: 1 },
    { category: "culture", question: "איך נקרא טקס הגשת התה המסורתי ביפן?", options: ["איקבנה", "סאדו", "אוריגמי", "בונסאי"], correctIndex: 1 },
    { category: "food", question: "מאיזה חומר גלם עשוי הטופו?", options: ["אורז", "פולי סויה", "תירס", "חיטה"], correctIndex: 1 },
    { category: "sports", question: "מהו ספורט הלחימה המסורתי הנחשב לספורט הלאומי של יפן?", options: ["ג'ודו", "קראטה", "סומו", "קנדו"], correctIndex: 2 },
    { category: "geography", question: "מהי בירת יפן?", options: ["אוסקה", "קיוטו", "טוקיו", "יוקוהמה"], correctIndex: 2 },
    { category: "history", question: "איזו עיר הייתה בירת יפן הקיסרית לפני טוקיו?", options: ["קיוטו", "אוסקה", "נגויה", "קובה"], correctIndex: 0 },
    { category: "culture", question: "איך נקראים העצים המיניאטוריים המעוצבים המסורתיים ביפן?", options: ["בונסאי", "איקבנה", "אוריגמי", "מנגה"], correctIndex: 0 },
    { category: "geography", question: "כמה אזורים/איים עיקריים מרכיבים את יפן?", options: ["2", "4", "6", "8"], correctIndex: 1 },
  ],
};

async function main() {
  for (const [slug, questions] of Object.entries(QUESTIONS)) {
    const destination = await prisma.destination.findUnique({ where: { slug } });
    if (!destination) {
      console.log(`skip ${slug}: destination not found`);
      continue;
    }
    const existing = await prisma.quizQuestion.count({ where: { destinationId: destination.id } });
    if (existing > 0) {
      console.log(`skip ${slug}: already has ${existing} questions`);
      continue;
    }
    await prisma.quizQuestion.createMany({
      data: questions.map((q) => ({
        destinationId: destination.id,
        category: q.category,
        question: q.question,
        options: JSON.stringify(q.options),
        correctIndex: q.correctIndex,
      })),
    });
    console.log(`seeded ${questions.length} questions for ${slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
