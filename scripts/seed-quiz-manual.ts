// Fills the 11 destinations the launch audit found with zero quiz
// questions. Unlike scripts/backfill-quiz.ts (which needs Gemini, blocked
// by the API key's free-tier daily cap), these are hand-authored directly
// from general knowledge — zero API cost, same format as the existing
// hand-written questions (checked a Prague sample before writing this).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

type Q = { category: string; question: string; options: string[]; correctIndex: number };

const DATA: Record<string, Q[]> = {
  cyprus: [
    { category: "history", question: "איזו מעצמה שלטה בקפריסין עד העצמאות ב-1960?", options: ["צרפת", "בריטניה", "איטליה", "טורקיה"], correctIndex: 1 },
    { category: "history", question: "השם 'קפריסין' קשור היסטורית לאיזה מתכת שהופקה באי?", options: ["ברזל", "כסף", "נחושת", "זהב"], correctIndex: 2 },
    { category: "geography", question: "קפריסין היא האי השלישי בגודלו בים התיכון, אחרי סיציליה ו...", options: ["קורסיקה", "סרדיניה", "כרתים", "מיורקה"], correctIndex: 1 },
    { category: "geography", question: "לאיזה שני חלקים פוליטיים מחולק האי מאז 1974?", options: ["צפוני ודרומי", "יווני וטורקי", "מזרחי ומערבי", "חופי והררי"], correctIndex: 1 },
    { category: "politics", question: "קפריסין חברה באיחוד האירופי החל משנת?", options: ["1995", "2004", "2010", "1985"], correctIndex: 1 },
    { category: "politics", question: "מהי בירת קפריסין?", options: ["לימסול", "לרנקה", "ניקוסיה", "פאפוס"], correctIndex: 2 },
    { category: "sports", question: "מהו הספורט הפופולרי ביותר בקפריסין?", options: ["כדורגל", "כדורסל", "טניס", "שייט"], correctIndex: 0 },
    { category: "sports", question: "איזה ענף ימי פופולרי מאוד לאור אקלים האי ואורך קו החוף?", options: ["צלילה", "האבקות", "סקי", "רכיבת אופניים"], correctIndex: 0 },
    { category: "culture", question: "לפי המיתולוגיה היוונית, איזו אלה נולדה מקצף הים ליד חופי קפריסין?", options: ["אתנה", "אפרודיטה", "הרה", "ארטמיס"], correctIndex: 1 },
    { category: "culture", question: "מה השפה הרשמית העיקרית בדרום קפריסין?", options: ["טורקית", "אנגלית", "יוונית", "איטלקית"], correctIndex: 2 },
    { category: "food", question: "גבינת החלומי המפורסמת מקורה ב...?", options: ["יוון", "קפריסין", "לבנון", "טורקיה"], correctIndex: 1 },
    { category: "food", question: "איזה משקל אלכוהולי מסורתי מיוצר בקפריסין מענבים?", options: ["זיוואניה", "אוזו", "רקיה", "גרפה"], correctIndex: 0 },
  ],
  croatia: [
    { category: "history", question: "קרואטיה הייתה חלק מאיזו מדינה פדרלית עד 1991?", options: ["צ'כוסלובקיה", "יוגוסלביה", "אוסטריה-הונגריה", "ברית המועצות"], correctIndex: 1 },
    { category: "history", question: "איזו עיר קרואטית עתיקה הייתה מרכז מסחרי חשוב תחת ונציה?", options: ["זאגרב", "דוברובניק", "אוסייק", "ריקה"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת קרואטיה?", options: ["ספליט", "דוברובניק", "זאגרב", "זאדר"], correctIndex: 2 },
    { category: "geography", question: "לאורך איזה ים משתרע החוף הקרואטי המפורסם?", options: ["הים השחור", "הים האדריאטי", "הים האגאי", "הים הים תיכוני המערבי"], correctIndex: 1 },
    { category: "politics", question: "קרואטיה הצטרפה לאיחוד האירופי בשנת?", options: ["2004", "2013", "2016", "2020"], correctIndex: 1 },
    { category: "politics", question: "מהו המטבע הרשמי של קרואטיה כיום?", options: ["קונה קרואטית", "יורו", "פורינט", "לב"], correctIndex: 1 },
    { category: "sports", question: "לאיזה מקום הגיעה נבחרת קרואטיה בכדורגל במונדיאל 2018?", options: ["מקום ראשון", "מקום שני", "מקום שלישי", "רבע גמר"], correctIndex: 1 },
    { category: "sports", question: "איזה כדורגלן קרואטי זכה בכדור הזהב ב-2018?", options: ["איבן ראקיטיץ'", "לוקה מודריץ'", "מריו מנדז'וקיץ'", "איוואן פריישיץ'"], correctIndex: 1 },
    { category: "culture", question: "עיר החומות דוברובניק שימשה כזירת צילומים לאיזו סדרת טלוויזיה מפורסמת?", options: ["בית הנייר", "משחקי הכס", "סטריינג'ר תינגס", "ויקינגים"], correctIndex: 1 },
    { category: "culture", question: "פארק הלאומי המפורסם בקרואטיה, הידוע במפלים ואגמים טורקיז, נקרא?", options: ["פליטביצה", "קרקה", "פאקלניצה", "ריסניאק"], correctIndex: 0 },
    { category: "food", question: "איזה בשר מיובש מוכר, בדומה לפרושוטו, מיוצר באזור דלמטיה?", options: ["פרשוט דלמטי", "פרושוטו קרואטי", "קולביצה", "פנצטה"], correctIndex: 0 },
    { category: "food", question: "עט מסורתי קרואטי בשם 'צ'בפי' הוא בעצם?", options: ["מרק דגים", "נקניקיות גריל קטנות", "פשטידת בשר", "לחם שום"], correctIndex: 1 },
  ],
  romania: [
    { category: "history", question: "איזו דמות היסטורית מהמאה ה-15, שליט וולאכיה, היוותה השראה לדרקולה?", options: ["ולאד צפלש", "שטפן הגדול", "מיכאי האמיץ", "קרול הראשון"], correctIndex: 0 },
    { category: "history", question: "מתי הסתיים המשטר הקומוניסטי ברומניה ונופל צ'אושסקו?", options: ["1985", "1989", "1991", "1995"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת רומניה?", options: ["קלוז'-נאפוקה", "בוקרשט", "יאשי", "טימישוארה"], correctIndex: 1 },
    { category: "geography", question: "איזו שרשרת הרים חוצה את רומניה וידועה כמקום ה'מולדת' של אגדת דרקולה (טרנסילבניה)?", options: ["האלפים", "הקרפטים", "הפירנאים", "האורל"], correctIndex: 1 },
    { category: "politics", question: "רומניה הצטרפה לאיחוד האירופי בשנת?", options: ["2004", "2007", "2010", "2013"], correctIndex: 1 },
    { category: "politics", question: "מהו המטבע הרשמי של רומניה?", options: ["יורו", "לאו רומני", "פורינט", "לב"], correctIndex: 1 },
    { category: "sports", question: "איזו מתעמלת רומנייה זכתה בציון מושלם ראשון בהיסטוריית האולימפיאדה ב-1976?", options: ["נדיה קומנצ'י", "סימונה הלפ", "לביניה מילושוביץ'", "אנדריאה רדוקן"], correctIndex: 0 },
    { category: "sports", question: "איזו שחקנית טניס רומנייה זכתה בוימבלדון וברולאן גארוס?", options: ["סימונה הלפ", "נדיה קומנצ'י", "מוניקה סלש", "אנה איבנוביץ'"], correctIndex: 0 },
    { category: "culture", question: "טירת ברן, המיוחסת לאגדת דרקולה, ממוקמת באיזה אזור?", options: ["מולדביה", "טרנסילבניה", "וולאכיה", "דוברוג'ה"], correctIndex: 1 },
    { category: "culture", question: "מהי השפה הרשמית של רומניה, ממשפחת השפות?", options: ["סלאבית", "רומאנית (לטינית)", "אוגרו-פינית", "גרמאנית"], correctIndex: 1 },
    { category: "food", question: "מנת הבשר הלאומית הרומנית, הכוללת בשר טחון גליל בתבלינים על האש, נקראת?", options: ["מיטיטיי", "סרמלה", "מאמליגה", "צ'ורבה"], correctIndex: 0 },
    { category: "food", question: "'מאמליגה' המסורתית ברומניה עשויה בעיקר מ?", options: ["תפוחי אדמה", "קמח תירס", "אורז", "שעועית"], correctIndex: 1 },
  ],
  austria: [
    { category: "history", question: "איזו שושלת שלטה באוסטריה במשך מאות שנים עד 1918?", options: ["הבסבורג", "הוהנצולרן", "רומנוב", "בורבון"], correctIndex: 0 },
    { category: "history", question: "מי היה מלחין קלאסי דגול שנולד בזלצבורג, אוסטריה?", options: ["באך", "מוצרט", "בטהובן", "שופן"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת אוסטריה?", options: ["זלצבורג", "וינה", "גראץ", "אינסברוק"], correctIndex: 1 },
    { category: "geography", question: "איזו שרשרת הרים מכסה חלק גדול משטח אוסטריה?", options: ["הפירנאים", "האלפים", "הקרפטים", "הדולומיטים"], correctIndex: 1 },
    { category: "politics", question: "אוסטריה חברה באיחוד האירופי מאז?", options: ["1995", "2004", "1985", "2000"], correctIndex: 0 },
    { category: "politics", question: "מהי צורת השלטון באוסטריה?", options: ["מלוכה חוקתית", "רפובליקה פדרלית", "רפובליקה נשיאותית טהורה", "דיקטטורה"], correctIndex: 1 },
    { category: "sports", question: "באיזה ענף ספורט חורף מצטיינת אוסטריה במיוחד?", options: ["סקי אלפיני", "האבקות", "כדורסל", "בייסבול"], correctIndex: 0 },
    { category: "sports", question: "מי הוא נהג הפורמולה 1 האוסטרי האגדי, אלוף עולם שלוש פעמים?", options: ["ניקי לאודה", "יוכן רינדט", "גרהרד ברגר", "אלכס וורסטפן"], correctIndex: 0 },
    { category: "culture", question: "ארמון שנברון בווינה שימש כארמון הקיץ של איזו משפחה מלוכה?", options: ["הבסבורג", "רומנוב", "טיודור", "בורבון"], correctIndex: 0 },
    { category: "culture", question: "וינה נחשבת בירת העולם של איזה ז'אנר מוזיקלי?", options: ["ג'אז", "מוזיקה קלאסית", "רוק", "היפ הופ"], correctIndex: 1 },
    { category: "food", question: "'שניצל וינאי' המקורי מוכן בדרך כלל מאיזה בשר?", options: ["עגל", "עוף", "בקר", "הודו"], correctIndex: 0 },
    { category: "food", question: "עוגת השוקולד המפורסמת 'זאכר טורטה' מקורה ב...?", options: ["גרמניה", "אוסטריה", "שווייץ", "הונגריה"], correctIndex: 1 },
  ],
  philippines: [
    { category: "history", question: "איזו מעצמה אירופית שלטה בפיליפינים במשך כ-300 שנה עד 1898?", options: ["בריטניה", "ספרד", "הולנד", "פורטוגל"], correctIndex: 1 },
    { category: "history", question: "לאחר ספרד, איזו מדינה שלטה בפיליפינים עד העצמאות ב-1946?", options: ["יפן", "ארה\"ב", "צרפת", "גרמניה"], correctIndex: 1 },
    { category: "geography", question: "הפיליפינים מורכבות מכ-?", options: ["500 איים", "7,000 איים", "50 איים", "100,000 איים"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת הפיליפינים?", options: ["סבו סיטי", "דוואו", "מנילה", "קברוילן"], correctIndex: 2 },
    { category: "politics", question: "מהי צורת השלטון בפיליפינים?", options: ["מלוכה", "רפובליקה נשיאותית", "דיקטטורה צבאית", "רפובליקה פרלמנטרית"], correctIndex: 1 },
    { category: "politics", question: "מהן שתי השפות הרשמיות של הפיליפינים?", options: ["טגלוג ואנגלית", "ספרדית ואנגלית", "מלאית וטגלוג", "סינית וטגלוג"], correctIndex: 0 },
    { category: "sports", question: "איזה ענף ספורט הוא הפופולרי ביותר בפיליפינים?", options: ["כדורסל", "כדורגל", "בייסבול", "קריקט"], correctIndex: 0 },
    { category: "sports", question: "איזה אגרוף פיליפיני מפורסם נחשב לאחד הגדולים בכל הזמנים?", options: ["מאני פקיאו", "פלויד מייווד'ר", "מייק טייסון", "אוסקר דה לה הויה"], correctIndex: 0 },
    { category: "culture", question: "גבעות השוקולד המפורסמות ('Chocolate Hills') נמצאות באי?", options: ["בורקאי", "בוהול", "פלאוואן", "סבו"], correctIndex: 1 },
    { category: "culture", question: "מרבית האוכלוסייה בפיליפינים היא בעלת אמונה דתית?", options: ["מוסלמית", "בודהיסטית", "נוצרית קתולית", "הינדית"], correctIndex: 2 },
    { category: "food", question: "המנה הלאומית הפיליפינית העשויה בשר מבושל בחומץ, סויה ושום נקראת?", options: ["אדובו", "לומפיה", "סיניגנג", "פנציט"], correctIndex: 0 },
    { category: "food", question: "'לצ'ון' המסורתי הפיליפיני הוא בעצם?", options: ["דג צלוי שלם", "חזיר צלוי שלם", "עוף ברוטב", "אורז מטוגן"], correctIndex: 1 },
  ],
  portugal: [
    { category: "history", question: "איזה נווט פורטוגלי מפורסם היה הראשון לחצות את הכף לתקווה הטובה?", options: ["ואסקו דה גאמה", "בארטולומאו דיאש", "פרננדו מגלן", "הנרי הנווט"], correctIndex: 1 },
    { category: "history", question: "מי היה הנווט הפורטוגלי הראשון שהגיע להודו בים ב-1498?", options: ["בארטולומאו דיאש", "ואסקו דה גאמה", "קולומבוס", "מגלן"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת פורטוגל?", options: ["פורטו", "ליסבון", "פארו", "קוימברה"], correctIndex: 1 },
    { category: "geography", question: "פורטוגל גובלת רק במדינה יבשתית אחת - איזו?", options: ["צרפת", "ספרד", "איטליה", "מרוקו"], correctIndex: 1 },
    { category: "politics", question: "פורטוגל הצטרפה לאיחוד האירופי (אז הקהילה הכלכלית) בשנת?", options: ["1975", "1986", "1995", "2000"], correctIndex: 1 },
    { category: "politics", question: "מהי צורת השלטון בפורטוגל?", options: ["מלוכה חוקתית", "רפובליקה פרלמנטרית", "דיקטטורה", "פדרציה"], correctIndex: 1 },
    { category: "sports", question: "איזה כדורגלן פורטוגלי נחשב לאחד הגדולים בכל הזמנים ושיחק בריאל מדריד ומנצ'סטר יונייטד?", options: ["לואיש פיגו", "כריסטיאנו רונאלדו", "אדר", "פפה"], correctIndex: 1 },
    { category: "sports", question: "נבחרת פורטוגל בכדורגל זכתה לראשונה באליפות אירופה בשנת?", options: ["2004", "2016", "2012", "2000"], correctIndex: 1 },
    { category: "culture", question: "סגנון המוזיקה המסורתי הפורטוגלי, המלנכולי והרגשי, נקרא?", options: ["פאדו", "פלמנקו", "טנגו", "בוסה נובה"], correctIndex: 0 },
    { category: "culture", question: "אריחי הקרמיקה הכחולים-לבנים המסורתיים בפורטוגל נקראים?", options: ["טאלוור", "אזולז'ו", "מיוזיקו", "פאיאנס"], correctIndex: 1 },
    { category: "food", question: "מאפה הביצים המתוק המפורסם של פורטוגל, במיוחד משכונת בלם בליסבון, נקרא?", options: ["פסטל דה נאטה", "בולו רי", "קרוסאן", "מלאסאדה"], correctIndex: 0 },
    { category: "food", question: "פורטוגל ידועה בייצור איזה יין מבוסס ומתוק, הנקרא על שם עיר נמל?", options: ["יין פורטו", "שרי", "מדיירה בלבד", "ורמוט"], correctIndex: 0 },
  ],
  dubai: [
    { category: "history", question: "דובאי היא חלק ממדינה המורכבת משבע אמירויות בשם?", options: ["איחוד האמירויות הערביות", "ערב הסעודית", "קטאר", "בחריין"], correctIndex: 0 },
    { category: "history", question: "מה היה הענף הכלכלי המרכזי של דובאי לפני עידן הנפט והתיירות?", options: ["דיג פנינים", "כרייה", "חקלאות", "טקסטיל"], correctIndex: 0 },
    { category: "geography", question: "דובאי ממוקמת על גדות איזה מפרץ?", options: ["מפרץ עדן", "המפרץ הפרסי", "ים סוף", "מפרץ עומאן"], correctIndex: 1 },
    { category: "geography", question: "בורג' ח'ליפה, הגורד השחקים הגבוה בעולם, נמצא ב...?", options: ["אבו דאבי", "דובאי", "שארג'ה", "דוחא"], correctIndex: 1 },
    { category: "politics", question: "מי עומד בראש כל אמירות באיחוד האמירויות?", options: ["נשיא נבחר", "שיח' (שליט תורשתי)", "ראש ממשלה", "מלך יחיד לכל האיחוד"], correctIndex: 1 },
    { category: "politics", question: "מהו המטבע הרשמי באיחוד האמירויות הערביות?", options: ["ריאל", "דירהם", "דינר", "לירה"], correctIndex: 1 },
    { category: "sports", question: "איזה ענף ספורט מסורתי פופולרי בדובאי, הכולל שימוש בעופות דורסים מאולפים?", options: ["ציד בזים", "קרלינג", "סייף", "חתירה"], correctIndex: 0 },
    { category: "sports", question: "דובאי מארחת מדי שנה טורניס גולף/טניס יוקרתי בינלאומי - איזה ענף בולט בעיר?", options: ["טניס", "כדורעף חופים", "האבקות", "קרלינג"], correctIndex: 0 },
    { category: "culture", question: "מהי הדת הרשמית של איחוד האמירויות הערביות?", options: ["נצרות", "האסלאם", "הינדואיזם", "יהדות"], correctIndex: 1 },
    { category: "culture", question: "האי המלאכותי הידוע בצורת עץ דקל בדובאי נקרא?", options: ["פאלם ג'ומיירה", "העולם", "יאס איילנד", "מרינה איילנד"], correctIndex: 0 },
    { category: "food", question: "מנת הבשר והאורז המסורתית הפופולרית באמירויות נקראת?", options: ["מנדי", "קוסקוס", "בריאני בלבד", "קבסה בלבד"], correctIndex: 0 },
    { category: "food", question: "איזה משקה קפה מסורתי מוגש באורחים כמחווה לאירוח בתרבות הערבית?", options: ["קפה ערבי (קהווה)", "אספרסו", "קפה תורכי בלבד", "לאטה"], correctIndex: 0 },
  ],
  greece: [
    { category: "history", question: "היוונים העתיקים נחשבים למקימי איזה משטר פוליטי, שהתפתח באתונה?", options: ["פיאודליזם", "דמוקרטיה", "קומוניזם", "תיאוקרטיה"], correctIndex: 1 },
    { category: "history", question: "משחקי האולימפיאדה המודרניים הראשונים נערכו ב-1896 באיזו עיר?", options: ["ספרטה", "אתונה", "קורינתוס", "דלפי"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת יוון?", options: ["סלוניקי", "אתונה", "פטראס", "הרקליון"], correctIndex: 1 },
    { category: "geography", question: "יוון מורכבת מאלפי איים, ומהו האי הגדול ביותר שלה?", options: ["רודוס", "כרתים", "קורפו", "סנטוריני"], correctIndex: 1 },
    { category: "politics", question: "יוון היא חברה באיחוד האירופי מאז?", options: ["1981", "2001", "1995", "1975"], correctIndex: 0 },
    { category: "politics", question: "מהי צורת השלטון ביוון כיום?", options: ["מלוכה", "רפובליקה פרלמנטרית", "דיקטטורה צבאית", "פדרציה"], correctIndex: 1 },
    { category: "sports", question: "איזה ענף ספורט עתיק החל ביוון והתקיים בהר האולימפוס לכבוד זאוס?", options: ["המשחקים האולימפיים", "הפנקרטיון בלבד", "מרוץ המרתון בלבד", "קרב מרכבות"], correctIndex: 0 },
    { category: "sports", question: "מרוץ המרתון קרוי על שם קרב וכפר יווני שממנו רץ שליח לאתונה - איך נקרא הכפר?", options: ["מרתון", "ספרטה", "תבאי", "ארגוס"], correctIndex: 0 },
    { category: "culture", question: "מקדש הפרתנון הידוע ניצב על גבעה בשם?", options: ["האקרופוליס", "האגורה", "האולימפוס", "הפניקס"], correctIndex: 0 },
    { category: "culture", question: "לפי המיתולוגיה היוונית, מי הוא אבי האלים היושב על הר האולימפוס?", options: ["פוסידון", "זאוס", "הרמס", "אפולו"], correctIndex: 1 },
    { category: "food", question: "הסלט היווני המסורתי כולל בדרך כלל עגבנייה, מלפפון, בצל וגבינת?", options: ["פטה", "מוצרלה", "צ'דר", "פרמזן"], correctIndex: 0 },
    { category: "food", question: "המאפה המתוק היווני העשוי שכבות בצק פילו, אגוזים ודבש נקרא?", options: ["בקלאווה", "טירמיסו", "סטרודל", "פאי לימון"], correctIndex: 0 },
  ],
  korea: [
    { category: "history", question: "קוריאה הדרומית וקוריאה הצפונית התפצלו לאחר איזו מלחמה שהסתיימה ב-1953?", options: ["מלחמת העולם השנייה", "מלחמת קוריאה", "מלחמת וייטנאם", "המלחמה הקרה"], correctIndex: 1 },
    { category: "history", question: "איזו שושלת שלטה בקוריאה במשך כ-500 שנה עד תחילת המאה ה-20?", options: ["שושלת גוריו", "שושלת ג'וסון", "שושלת סילה", "שושלת בקג'ה"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת קוריאה הדרומית?", options: ["בוסאן", "אינצ'און", "סיאול", "דאגו"], correctIndex: 2 },
    { category: "geography", question: "קוריאה הדרומית וצפונית מופרדות על ידי אזור בשם?", options: ["קו המשווה", "האזור המפורז (DMZ)", "תעלת קוריאה", "הגבול הכחול"], correctIndex: 1 },
    { category: "politics", question: "מהי צורת השלטון בקוריאה הדרומית?", options: ["רפובליקה נשיאותית", "מלוכה חוקתית", "דיקטטורה צבאית", "פדרציה קומוניסטית"], correctIndex: 0 },
    { category: "politics", question: "מהו המטבע הרשמי בקוריאה הדרומית?", options: ["יין", "וון קוריאני", "יואן", "דולר"], correctIndex: 1 },
    { category: "sports", question: "קוריאה הדרומית אירחה משחקים אולימפיים אילו פעמיים - קיץ ב-1988 וחורף ב-?", options: ["2010", "2018", "2014", "2022"], correctIndex: 1 },
    { category: "sports", question: "אמנות הלחימה הקוריאנית המסורתית, הכוללת בעיקר בעיטות, נקראת?", options: ["קראטה", "טאקוונדו", "ג'ודו", "קונג פו"], correctIndex: 1 },
    { category: "culture", question: "גל התרבות הפופולרי הקוריאני הכולל מוזיקת פופ, סדרות וסרטים מוכר בעולם בשם?", options: ["ג'יי-פופ", "האליו (K-Wave)", "סי-פופ", "קיי-דראמה בלבד"], correctIndex: 1 },
    { category: "culture", question: "מהי מערכת הכתב הקוריאנית הייחודית, שהומצאה במאה ה-15?", options: ["האנגול", "קאנג'י", "היראגנה", "פינין"], correctIndex: 0 },
    { category: "food", question: "המנה הקוריאנית הידועה ביותר, כרוב מותסס וחריף, נקראת?", options: ["קימצ'י", "בולגוגי", "בימבימבאפ", "טוקבוקי"], correctIndex: 0 },
    { category: "food", question: "'בולגוגי' הקוריאני המסורתי הוא בעצם?", options: ["מרק פיקנטי", "בשר בקר מושרה וצלוי", "אורז מטוגן", "נודלס קרים"], correctIndex: 1 },
  ],
  argentina: [
    { category: "history", question: "מתי הכריזה ארגנטינה על עצמאותה מספרד?", options: ["1776", "1816", "1850", "1900"], correctIndex: 1 },
    { category: "history", question: "מי הייתה איווה פרון (אביטה), דמות בולטת בהיסטוריה הארגנטינאית של המאה ה-20?", options: ["נשיאה", "אשת הנשיא חואן פרון ואייקון פוליטי", "גנרלית צבאית", "כותבת ההמנון"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת ארגנטינה?", options: ["רוסאריו", "קורדובה", "בואנוס איירס", "מנדוסה"], correctIndex: 2 },
    { category: "geography", question: "המפלים המרשימים איגואסו נמצאים בגבול ארגנטינה עם?", options: ["צ'ילה", "ברזיל", "בוליביה", "פרגוואי בלבד"], correctIndex: 1 },
    { category: "politics", question: "מהי צורת השלטון בארגנטינה?", options: ["מלוכה", "רפובליקה פדרלית נשיאותית", "דיקטטורה צבאית", "פרלמנטרית טהורה"], correctIndex: 1 },
    { category: "politics", question: "מהו המטבע הרשמי של ארגנטינה?", options: ["ריאל", "פסו ארגנטינאי", "דולר", "אסקודו"], correctIndex: 1 },
    { category: "sports", question: "איזה כדורגלן ארגנטינאי מוביל את נבחרת ארגנטינה לזכייה במונדיאל 2022?", options: ["דייגו מראדונה", "ליאונל מסי", "סרחיו אגואירו", "אנחל די מריה"], correctIndex: 1 },
    { category: "sports", question: "איזה ריקוד מסורתי ותיק נולד בבואנוס איירס ונחשב לסמל תרבותי ארגנטינאי?", options: ["סמבה", "טנגו", "סלסה", "פלמנקו"], correctIndex: 1 },
    { category: "culture", question: "השפה הרשמית של ארגנטינה היא?", options: ["פורטוגזית", "ספרדית", "איטלקית", "צרפתית"], correctIndex: 1 },
    { category: "culture", question: "שכונת לה בוקה בבואנוס איירס ידועה בבתיה הצבעוניים ובקשר שלה ל...?", options: ["מוזיקת רוק", "טנגו וכדורגל", "אמנות דתית", "תעשיית הקולנוע"], correctIndex: 1 },
    { category: "food", question: "ארגנטינה ידועה בעולם בעיקר בזכות איכות ה...שלה?", options: ["דגים", "בשר בקר", "פירות ים", "גבינות"], correctIndex: 1 },
    { category: "food", question: "המשקה החם המסורתי הנשתה בקבוצה דרך קשית מתכת בארגנטינה נקרא?", options: ["מאטה", "צ'יצ'ה", "פולקה", "אגואה דה פאנלה"], correctIndex: 0 },
  ],
  israel: [
    { category: "history", question: "באיזו שנה הוכרזה מדינת ישראל?", options: ["1945", "1948", "1956", "1967"], correctIndex: 1 },
    { category: "history", question: "מי הכריז על הקמת מדינת ישראל וכיהן כראש ממשלתה הראשון?", options: ["חיים ויצמן", "דוד בן-גוריון", "יצחק רבין", "מנחם בגין"], correctIndex: 1 },
    { category: "geography", question: "מהי בירת ישראל?", options: ["תל אביב", "ירושלים", "חיפה", "באר שבע"], correctIndex: 1 },
    { category: "geography", question: "מהי הנקודה הנמוכה ביותר על פני כדור הארץ, הנמצאת בישראל?", options: ["ים המלח", "עמק החולה", "הכנרת", "מכתש רמון"], correctIndex: 0 },
    { category: "politics", question: "מהי צורת השלטון בישראל?", options: ["מלוכה חוקתית", "דמוקרטיה פרלמנטרית", "רפובליקה נשיאותית", "פדרציה"], correctIndex: 1 },
    { category: "politics", question: "כיצד נקרא בית הנבחרים (הפרלמנט) של ישראל?", options: ["הכנסת", "הסנאט", "הבית", "המועצה"], correctIndex: 0 },
    { category: "sports", question: "איזה ענף ספורט הוא הפופולרי ביותר בישראל?", options: ["כדורסל", "כדורגל", "טניס", "שחייה"], correctIndex: 1 },
    { category: "sports", question: "קבוצת הכדורסל מכבי תל אביב זכתה במספר רב של אליפויות?", options: ["ליגת האלופות האירופית", "יוראליג", "NBA", "ליגת העל האנגלית"], correctIndex: 1 },
    { category: "culture", question: "מהי השפה הרשמית העיקרית של ישראל?", options: ["אנגלית", "עברית", "ערבית בלבד", "יידיש"], correctIndex: 1 },
    { category: "culture", question: "העיר העתיקה בירושלים כוללת אתרים קדושים לשלוש דתות - נצרות, יהדות ו...?", options: ["בודהיזם", "האסלאם", "הינדואיזם", "סיקיזם"], correctIndex: 1 },
    { category: "food", question: "מנת החומוס והפלאפל נחשבות למאכלים מרכזיים ב...?", options: ["מטבח האסייתי", "המטבח הישראלי/מזרח תיכוני", "המטבח האירופי", "המטבח האמריקאי"], correctIndex: 1 },
    { category: "food", question: "איזה סוג ארוחת בוקר עשירה ומגוונת נחשבת למסורתית בישראל?", options: ["ארוחת בוקר ישראלית עם סלטים וביצים", "קונטיננטל בלבד", "פנקייקים בלבד", "דגנים בלבד"], correctIndex: 0 },
  ],
};

async function main() {
  for (const [slug, questions] of Object.entries(DATA)) {
    const dest = await prisma.destination.findUnique({ where: { slug } });
    if (!dest) {
      console.log(`${slug}: destination not found, skipping`);
      continue;
    }
    const existing = await prisma.quizQuestion.count({ where: { destinationId: dest.id } });
    if (existing > 0) {
      console.log(`${slug}: already has ${existing} questions, skipping`);
      continue;
    }
    await prisma.quizQuestion.createMany({
      data: questions.map((q) => ({
        destinationId: dest.id,
        category: q.category,
        question: q.question,
        options: JSON.stringify(q.options),
        correctIndex: q.correctIndex,
      })),
    });
    console.log(`${slug}: created ${questions.length} questions`);
  }
  console.log("DONE");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
