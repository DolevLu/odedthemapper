import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Q = { category: string; question: string; options: [string, string, string, string]; correctIndex: number };

// 3 balanced decks per destination: sports, history, geography (geography +
// politics + culture + food group together as "geography & general").
const QUESTIONS: Record<string, Q[]> = {
  italy: [
    // sport
    { category: "sports", question: "כמה פעמים זכתה נבחרת איטליה במונדיאל בכדורגל?", options: ["2", "3", "4", "5"], correctIndex: 2 },
    { category: "sports", question: "מהי הליגה המקצועית המובילה בכדורגל באיטליה?", options: ["Serie A", "La Liga", "Bundesliga", "Ligue 1"], correctIndex: 0 },
    { category: "sports", question: "איזו קבוצת כדורגל איטלקית מכונה \"הגברת הזקנה\" (La Vecchia Signora)?", options: ["מילאן", "אינטר", "יובנטוס", "רומא"], correctIndex: 2 },
    { category: "sports", question: "איזה ענף ספורט קשור לגראן פרי המפורסם של איטליה?", options: ["טניס", "שחייה", "פורמולה 1", "כדורסל"], correctIndex: 2 },
    { category: "sports", question: "מהו שמו של מרוץ האופניים המסורתי המקיף את איטליה?", options: ["טור דה פראנס", "ג'ירו ד'איטליה", "וולטה", "פארי-רובה"], correctIndex: 1 },
    { category: "sports", question: "איזו קבוצת כדורגל משחקת יחד עם מילאן באצטדיון סן סירו?", options: ["יובנטוס", "נאפולי", "רומא", "אינטר מילאן"], correctIndex: 3 },
    { category: "sports", question: "מיהו שחקן הטניס האיטלקי המוביל בעולם בשנים האחרונות?", options: ["רפאל נדאל", "יאניק סינר", "נובאק ג'וקוביץ'", "רוג'ר פדרר"], correctIndex: 1 },
    { category: "sports", question: "באיזה אזור נערכו אולימפיאדת החורף 2026?", options: ["רומא", "ונציה", "מילאנו-קורטינה", "טורינו"], correctIndex: 2 },
    // history
    { category: "history", question: "מי היה הקיסר הרומי הראשון?", options: ["יוליוס קיסר", "אוגוסטוס", "נירון", "קונסטנטינוס"], correctIndex: 1 },
    { category: "history", question: "איזו עיר הייתה לבירתה האחרונה של האימפריה הרומית המערבית?", options: ["רומא", "מילאנו", "רוונה", "נאפולי"], correctIndex: 2 },
    { category: "history", question: "באיזו תקופה פרח הרנסאנס האיטלקי?", options: ["המאה ה-10", "המאה ה-15–16", "ימי הביניים המוקדמים", "המאה ה-19"], correctIndex: 1 },
    { category: "history", question: "מי היה המנהיג הפשיסטי ששלט באיטליה עד 1943?", options: ["גריבלדי", "קאבור", "בניטו מוסוליני", "ויטוריו עמנואלה"], correctIndex: 2 },
    { category: "history", question: "מתי התאחדה איטליה למדינה אחת?", options: ["1789", "1861", "1900", "1945"], correctIndex: 1 },
    { category: "history", question: "איזה אירוע הרסני התרחש בפומפיי ב-79 לספירה?", options: ["רעידת אדמה", "התפרצות הר געש וזוב", "שריפה גדולה", "מלחמה"], correctIndex: 1 },
    { category: "history", question: "מי צייר את תקרת הקפלה הסיסטינית?", options: ["רפאל", "מיכלאנג'לו", "ליאונרדו דה וינצ'י", "בוטיצ'לי"], correctIndex: 1 },
    { category: "history", question: "איזו משפחה שלטה בפירנצה בתקופת הרנסאנס?", options: ["בורג'יה", "ספורצה", "מדיצ'י", "גונזאגה"], correctIndex: 2 },
    // geography & general
    { category: "geography", question: "מהו הנהר הארוך ביותר באיטליה?", options: ["הפו", "הטיבר", "הארנו", "האדיג'ה"], correctIndex: 0 },
    { category: "culture", question: "באיזו עיר איטלקית נולדה הפיצה?", options: ["רומא", "נאפולי", "מילאנו", "פירנצה"], correctIndex: 1 },
    { category: "geography", question: "מה שמו של הר הגעש הפעיל הסמוך לנאפולי?", options: ["אטנה", "וזוב", "סטרומבולי", "וולקנו"], correctIndex: 1 },
    { category: "geography", question: "אילו שני איים גדולים שייכים לאיטליה?", options: ["סיציליה וסרדיניה", "קורסיקה ומיורקה", "כרתים ורודוס", "מלטה וקפרי"], correctIndex: 0 },
    { category: "food", question: "איזה מאכל איטלקי מסורתי מבוסס על בצק תפוחי אדמה?", options: ["ראביולי", "טורטליני", "ניוקי", "לזניה"], correctIndex: 2 },
    { category: "politics", question: "מהי צורת השלטון הנוכחית באיטליה?", options: ["מונרכיה חוקתית", "רפובליקה נשיאותית", "רפובליקה פרלמנטרית", "פדרציה"], correctIndex: 2 },
    { category: "geography", question: "איזו עיר איטלקית בנויה על תעלות ומפורסמת בגונדולות?", options: ["מילאנו", "בולוניה", "ונציה", "טורינו"], correctIndex: 2 },
    { category: "geography", question: "מהו המטבע הרשמי של איטליה?", options: ["לירה", "יורו", "פרנק", "דולר"], correctIndex: 1 },
  ],
  japan: [
    // sport
    { category: "sports", question: "מהו ספורט הלחימה המסורתי הנחשב לספורט הלאומי של יפן?", options: ["ג'ודו", "קראטה", "סומו", "קנדו"], correctIndex: 2 },
    { category: "sports", question: "איזה ענף ספורט יפני עוסק בקשת מסורתית?", options: ["קיודו", "ג'ודו", "קראטה", "איקבנה"], correctIndex: 0 },
    { category: "sports", question: "מהי אמנות הלחימה היפנית שמבוססת בעיקר על השלכות ואחיזות?", options: ["קראטה", "ג'ודו", "קנדו", "איאידו"], correctIndex: 1 },
    { category: "sports", question: "באיזו עיר יפנית נערכו אולימפיאדת הקיץ 2020 (שנדחתה ל-2021)?", options: ["אוסקה", "קיוטו", "טוקיו", "יוקוהמה"], correctIndex: 2 },
    { category: "sports", question: "איזה ספורט כדור פופולרי מאוד ביפן עם ליגה מקצועית בשם NPB?", options: ["כדורגל", "בייסבול", "כדורסל", "כדורעף"], correctIndex: 1 },
    { category: "sports", question: "איך נקראת אמנות הלחימה היפנית עם חרבות במבוק?", options: ["קנדו", "ג'ודו", "קראטה", "סומו"], correctIndex: 0 },
    { category: "sports", question: "לאיזה ספורט שייכת ה-J-League היפנית?", options: ["בייסבול", "כדורסל", "כדורגל", "רוגבי"], correctIndex: 2 },
    { category: "sports", question: "איך נקראת חגורת הבד המיוחדת שלובשים מתאבקי סומו?", options: ["מאוואשי", "קימונו", "יוקטה", "האקאמה"], correctIndex: 0 },
    // history
    { category: "history", question: "מהי תקופת השלטון הצבאי שנמשכה עד 1868 ונקראת על שם השוגונים?", options: ["תקופת הייאן", "תקופת אדו", "תקופת מייג'י", "תקופת נארה"], correctIndex: 1 },
    { category: "history", question: "איזו עיר הייתה בירת יפן הקיסרית לפני טוקיו?", options: ["אוסקה", "קיוטו", "נגויה", "קובה"], correctIndex: 1 },
    { category: "history", question: "איך נקרא מעמד הלוחמים המסורתי ביפן?", options: ["נינג'ה", "סמוראי", "שוגון", "דאימיו"], correctIndex: 1 },
    { category: "history", question: "באיזו שנה הסתיימה מלחמת העולם השנייה עבור יפן?", options: ["1939", "1942", "1945", "1950"], correctIndex: 2 },
    { category: "history", question: "באיזו שנה החל 'שיקום מייג'י' שסימן את המעבר של יפן למדינה מודרנית?", options: ["1600", "1868", "1900", "1945"], correctIndex: 1 },
    { category: "history", question: "מהו שם הטירה ההיסטורית המפורסמת באוסקה?", options: ["טירת הימאג'י", "טירת נגויה", "טירת אוסקה", "טירת מטסומוטו"], correctIndex: 2 },
    { category: "history", question: "איזו עיר יפנית נפגעה מפצצת אטום ב-6 באוגוסט 1945?", options: ["נגסאקי", "טוקיו", "הירושימה", "אוסקה"], correctIndex: 2 },
    { category: "history", question: "מה מסמל דגל יפן?", options: ["הירח", "השמש העולה", "הר פוג'י", "פרח דובדבן"], correctIndex: 1 },
    // geography & general
    { category: "geography", question: "מהו ההר הגבוה ביותר ביפן?", options: ["פוג'י", "טאטה", "הקוסאן", "אסו"], correctIndex: 0 },
    { category: "geography", question: "מהי בירת יפן?", options: ["אוסקה", "קיוטו", "טוקיו", "יוקוהמה"], correctIndex: 2 },
    { category: "geography", question: "כמה אזורים/איים עיקריים מרכיבים את יפן?", options: ["2", "4", "6", "8"], correctIndex: 1 },
    { category: "culture", question: "איך נקרא טקס הגשת התה המסורתי ביפן?", options: ["איקבנה", "סאדו", "אוריגמי", "בונסאי"], correctIndex: 1 },
    { category: "food", question: "מאיזה חומר גלם עשוי הטופו?", options: ["אורז", "פולי סויה", "תירס", "חיטה"], correctIndex: 1 },
    { category: "culture", question: "איך נקראים העצים המיניאטוריים המעוצבים המסורתיים ביפן?", options: ["בונסאי", "איקבנה", "אוריגמי", "מנגה"], correctIndex: 0 },
    { category: "geography", question: "מהו המטבע הרשמי של יפן?", options: ["וון", "יואן", "יין", "באט"], correctIndex: 2 },
    { category: "culture", question: "איזה פרח מסמל את האביב ביפן ונחגג בפסטיבל ה'האנאמי'?", options: ["לוטוס", "חבצלת", "ורד", "פרח דובדבן (סאקורה)"], correctIndex: 3 },
  ],
};

async function main() {
  for (const [slug, questions] of Object.entries(QUESTIONS)) {
    const destination = await prisma.destination.findUnique({ where: { slug } });
    if (!destination) {
      console.log(`skip ${slug}: destination not found`);
      continue;
    }
    await prisma.quizQuestion.deleteMany({ where: { destinationId: destination.id } });
    await prisma.quizQuestion.createMany({
      data: questions.map((q) => ({
        destinationId: destination.id,
        category: q.category,
        question: q.question,
        options: JSON.stringify(q.options),
        correctIndex: q.correctIndex,
      })),
    });
    console.log(`re-seeded ${questions.length} questions for ${slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
