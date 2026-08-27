import Link from "next/link";

export const metadata = { title: "מדיניות פרטיות | עודד המנקד" };

/** Standalone (no sidebar/auth) — a privacy policy needs a stable, always-
 * public URL regardless of login state, mainly for Google Cloud Console /
 * OAuth consent screen verification. */
export default function PrivacyPage() {
  return (
    <div dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 text-sm leading-relaxed">
      <Link href="/" className="text-sm font-semibold opacity-60 hover:opacity-100">
        ← חזרה לדף הבית
      </Link>

      <div>
        <h1 className="mb-1 text-2xl font-bold">מדיניות פרטיות ותנאי שימוש - עודד המנקד</h1>
        <p className="text-xs opacity-50">עודכן לאחרונה: 24 באוגוסט 2026</p>
      </div>

      <p>
        עודד המנקד (&quot;האפליקציה&quot;, &quot;השירות&quot;, &quot;אנחנו&quot;) מכבדת את פרטיות המשתמשים שלה. מסמך זה מסביר אילו
        מידע אנו אוספים, כיצד אנו משתמשים בו, עם מי אנו משתפים אותו, וכיצד ניתן לפנות אלינו בנוגע לפרטיותכם - וכן את תנאי
        השימוש הבסיסיים בשירות.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">תנאי שימוש</h2>
        <ul className="flex list-inside list-disc flex-col gap-1">
          <li>
            כל התוכן באפליקציה - המלצות, תיאורי מקומות, מסלולים מוצעים, טיפים ומידע חירום - נועד להשראה ולנוחות בלבד, ואינו
            ייעוץ מקצועי. אנחנו לא מדריכי טיולים מוסמכים, ואיננו מתחייבים לדיוק, לעדכניות, או להתאמה של כל פרט להיבטים
            הרלוונטיים לכם.
          </li>
          <li>
            השימוש באפליקציה, בהמלצותיה ובמידע שבה הוא באחריותכם הבלעדית. אנו לא נישא באחריות לכל נזק - ישיר, עקיף, כספי,
            גופני או אחר - שייגרם כתוצאה מהסתמכות על תוכן באפליקציה, לרבות (אך לא רק) המלצות מקומות, מסלולים, שעות
            פתיחה, ומידע חירום/בטיחות.
          </li>
          <li>רכישת גישה ליעד או מנוי היא סופית ואינה ניתנת להחזר כספי, אלא אם נדרש אחרת על פי חוק.</li>
          <li>
            ניתן לבטל מנוי מתחדש (Family/Org) בכל עת דרך עמוד החשבון - הביטול מונע חיוב נוסף בעתיד, אך אינו מזכה בהחזר על
            תקופה ששולמה כבר.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">איזה מידע אנו אוספים</h2>
        <ul className="flex list-inside list-disc flex-col gap-1">
          <li>
            <strong>פרטי חשבון:</strong> שם, כתובת אימייל, וסיסמה מוצפנת (או פרטי התחברות דרך חשבון Google, אם בחרתם להתחבר כך) -
            בעת הרשמה ושימוש באפליקציה.
          </li>
          <li>
            <strong>מיקום:</strong> רק אם אישרתם זאת במפורש בדפדפן, אנו משתמשים במיקום שלכם כדי להציג המלצות קרובות אליכם על
            המפה ולתעד &quot;איפה כבר הייתם&quot; ביעד שרכשתם. ניתן לכבות שיתוף מיקום בכל עת דרך הגדרות הדפדפן/המכשיר.
          </li>
          <li>
            <strong>תוכן שאתם מעלים:</strong> תמונות לאלבום הטיול, הערות במסלול, הוצאות שתעדתם, ופרטי כרטיסי טיסה/מלון
            שהזנתם ידנית - לשימושכם האישי בלבד בתוך האפליקציה.
          </li>
          <li>
            <strong>נתוני תשלום:</strong> תשלומים מעובדים ישירות דרך Stripe או PayMe - אנחנו <u>לא</u> שומרים ולא רואים את
            פרטי כרטיס האשראי המלאים שלכם בשרתים שלנו.
          </li>
          <li>
            <strong>נתוני שימוש:</strong> אילו יעדים ומסכים באפליקציה נצפו, לצורך שיפור השירות ותמיכה טכנית.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">כיצד אנו משתמשים במידע</h2>
        <ul className="flex list-inside list-disc flex-col gap-1">
          <li>להפעיל את השירותים שרכשתם (מפה, מתכנן מסלול, הוצאות, לוגיסטיקה ועוד).</li>
          <li>להציג המלצות רלוונטיות לפי מיקום וזמן, כאשר שיתפתם מיקום.</li>
          <li>לתקשר איתכם לגבי החשבון, רכישות, ועדכוני שירות.</li>
          <li>לשפר ולתחזק את האפליקציה, ולזהות ולתקן תקלות.</li>
        </ul>
        <p>איננו מוכרים את המידע האישי שלכם לצדדים שלישיים, ואיננו משתמשים בו למטרות פרסום מחוץ לאפליקציה.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">שירותי צד שלישי</h2>
        <p>האפליקציה משתמשת בשירותים חיצוניים הבאים, הכפופים למדיניות הפרטיות שלהם:</p>
        <ul className="flex list-inside list-disc flex-col gap-1">
          <li>Google Maps Platform ו-Google Sign-In - הצגת מפות והתחברות.</li>
          <li>Stripe ו-PayMe - עיבוד תשלומים מאובטח.</li>
          <li>Vercel - אחסון ותשתית האפליקציה, כולל תמונות שהועלו.</li>
          <li>Google Gemini API ו-Wikipedia - העשרת תוכן מקומות (תיאורים ותמונות) ללא זיהוי אישי שלכם.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">עוגיות (Cookies)</h2>
        <p>
          אנו משתמשים בעוגיית התחברות (session) הכרחית לצורך שמירת החיבור שלכם לחשבון. אנו לא משתמשים בעוגיות מעקב
          פרסומיות.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">זכויותיכם</h2>
        <p>
          ניתן לבקש בכל עת לעיין במידע שנשמר עליכם, לתקן אותו, או למחוק את חשבונכם וכל המידע הקשור אליו, בפנייה לכתובת
          המייל בהמשך.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">יצירת קשר</h2>
        <p>
          לכל שאלה בנוגע למדיניות פרטיות זו, ניתן לפנות אלינו בכתובת{" "}
          <a href="mailto:dolev0018@gmail.com" className="underline">
            dolev0018@gmail.com
          </a>
          .
        </p>
      </section>

      <p className="text-xs opacity-50">מדיניות זו עשויה להתעדכן מעת לעת; שינויים מהותיים יפורסמו בעמוד זה.</p>
    </div>
  );
}
