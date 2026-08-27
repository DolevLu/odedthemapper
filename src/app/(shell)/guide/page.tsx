import type { Metadata } from "next";

export const metadata: Metadata = { title: "מדריך שימוש - עודד המנקד" };

type Feature = {
  icon: string;
  title: string;
  intro: string;
  points: string[];
};

const FEATURES: Feature[] = [
  {
    icon: "🗺️",
    title: "המפה",
    intro: "מסך הבית של כל יעד - כל הנקודות המומלצות על מפה אינטראקטיבית, צבועות לפי קטגוריה.",
    points: [
      "לוחצים על סיכה כדי לראות תמונה, תיאור, ולהוסיף למועדפים או ל\"להזמנה\".",
      "מסננים לפי קטגוריה (מסעדות, ברים, אטרקציות...) בשורת הכפתורים העליונה.",
      "🔥 מפת חום מראה איפה יש הכי הרבה נקודות מומלצות - טוב לבחירת שכונת לינה.",
      "🟢 \"איפה כבר הייתי\" מסמן את המסלול שעשיתם בפועל, לפי מיקום GPS.",
      "כפתור \"תגיות גוגל מפות\" מציג גם עסקים אמיתיים מגוגל מפות (לא רק את הרשימה שלנו) - אפשר לשמור אותם למפה האישית שלכם.",
      "📥 שמירה אופליין שומרת את כל התוכן של היעד לצפייה גם בלי אינטרנט.",
      "המיקום שלכם מוצג אוטומטית ברגע שהטיול מתחיל (לפי תאריך הטיסה שהזנתם) - לפני כן המפה פשוט ממורכזת על היעד.",
    ],
  },
  {
    icon: "🧭",
    title: "מה עכשיו",
    intro: "מסך שמתעדכן כל הזמן לפי הזמן והמיקום שלכם - התשובה המהירה ל\"מה עושים עכשיו\".",
    points: [
      "ספירה לאחור חיה לטיסה, ובזמן הטיול - המסלול של היום הנוכחי בלבד.",
      "כפתורי \"מיקום\" / \"יורד גשם?\" / \"חירום\" נותנים המלצות מותאמות בלחיצה אחת.",
      "המלצות ממוינות לפי קרבה פיזית אליכם, ברגע זה.",
      "\"לזכור להזמין\" - ✓ ירוק מסמן שהזמנתם, ✗ אדום מסיר מהרשימה שלכם באופן אישי (לא משפיע על מטיילים אחרים).",
      "אם יש לכם יותר מיעד אחד פעיל במנוי - שורת מעברים קטנה למעלה מאפשרת לקפוץ ישר ליעד אחר.",
    ],
  },
  {
    icon: "📅",
    title: "מסלול",
    intro: "בונים את סדר היום־יום של הטיול, ידנית או אוטומטית.",
    points: [
      "מצב רגיל: גוררים נקודות לתוך ימים ספציפיים וקובעים שעה לכל תחנה.",
      "🔥 מסלול טינדר: מחליקים ימין (רוצה) או שמאל (לא) על נקודות, והמערכת בונה מסלול מלא אוטומטית - כולל חלוקה חכמה לפי אזורים גיאוגרפיים בעיר, לא רק לפי איכות הנקודה.",
      "אפשר לייצא את המסלול כ-PDF.",
      "במובייל יש כפתור \"כל הימים\" שמציג את המסלול השלם על המפה בבת אחת, לא רק יום נבחר.",
    ],
  },
  {
    icon: "❤️",
    title: "מועדפים והטבות",
    intro: "כל מה שסימנתם בלב שמור כאן, לצד המלצות וטיפים כלליים ליעד.",
    points: [
      "💡 טיפים חשובים - מידע מעשי (כסף, נהלים, תחבורה, ויזה) ספציפי ליעד.",
      "🎁 הנחות וקופונים לשירותים חיצוניים רלוונטיים.",
      "כל הנקודות שסימנתם ❤️ בכל מסך באפליקציה מרוכזות כאן.",
    ],
  },
  {
    icon: "🎟️",
    title: "להזמנה",
    intro: "רשימה של אטרקציות ומסעדות שממש כדאי להזמין/לשריין מראש - לא לחכות לתור במקום.",
    points: [
      "מציג גם חגים וחגיגות קרובות ביעד, אם רלוונטי.",
      "אפשר לסנן לפי סוג (אטרקציות, מסעדות, ברים ועוד).",
    ],
  },
  {
    icon: "✈️",
    title: "לוגיסטיקה",
    intro: "כל פרטי הטיסות, המלונות והמסמכים במקום אחד.",
    points: [
      "הוספת טיסה כאן היא מה שמפעיל את הספירה לאחור במסך \"מה עכשיו\".",
      "מפת חום מציגה לאן כדאי למקם את הלינה שלכם לפי צפיפות ההמלצות באזור.",
    ],
  },
  {
    icon: "💸",
    title: "הוצאות",
    intro: "מעקב תקציב יומי, עם ממיר מטבעות מובנה שלא דורש יציאה מהאפליקציה.",
    points: ["רואים כמה נשאר לכם ליום הנוכחי ולכל הטיול, לא רק סה\"כ מצטבר."],
  },
  {
    icon: "🌤️",
    title: "מזג אוויר",
    intro: "תחזית עדכנית ליעד, כדי לתכנן את היום בהתאם.",
    points: [],
  },
  {
    icon: "🧠",
    title: "חידונים",
    intro: "טריוויה אמיתית על היעד - היסטוריה, גיאוגרפיה, תרבות, אוכל ועוד.",
    points: ["דרך נחמדה ללמוד קצת על היעד לפני שמגיעים אליו, לא רק אחרי."],
  },
  {
    icon: "💬",
    title: "שיחון",
    intro: "ביטויים שימושיים בשפה המקומית, עם הגייה.",
    points: [],
  },
  {
    icon: "🧳",
    title: "ציוד וצ׳ק ליסט",
    intro: "רשימת אריזה סטנדרטית, פלוס מעקב אחרי כל מה שסימנתם \"להזמין\" בשאר המסכים.",
    points: [],
  },
  {
    icon: "📸",
    title: "אלבום",
    intro: "אלבום דיגיטלי אישי לתמונות מהטיול, בעיצוב שונה לכל יעד.",
    points: ["זמין לצפייה מקדימה גם בלי חשבון - העלאה ושמירה דורשות התחברות."],
  },
  {
    icon: "🧑‍💼",
    title: "תכנון מסלול ללקוח + CRM",
    intro: "כלים לתוכנית הארגונים: בונים מסלול מקצועי ללקוח, כולל אופטימיזציית מרחקים אוטומטית, ושולחים הצעת מחיר ממותגת עם קישור לאישור ישיר מהלקוח - בלי שהוא צריך חשבון באפליקציה.",
    points: [],
  },
];

export default function GuidePage() {
  return (
    <div className="flex flex-1 flex-col" style={{ background: "#FBF6EE" }}>
      <section className="relative overflow-hidden px-6 py-12 text-center sm:py-16">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[640px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #F3EEFF, transparent 70%)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-semibold shadow-sm">📖 מדריך שימוש</span>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">איך משתמשים בעודד המנקד</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg opacity-70">כל מסך, כל כפתור, כל פיצ׳ר - במקום אחד. מוזמנים לחזור לכאן בכל שלב.</p>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-4xl px-6 pb-10">
        <HowMapWorksDiagram />
      </section>

      <section className="relative mx-auto w-full max-w-4xl px-6 pb-10">
        <HowNowWorksDiagram />
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <h2 className="mb-6 text-2xl font-extrabold">כל המסכים, לפי סדר בתפריט</h2>
        <div className="flex flex-col gap-4">
          {FEATURES.map((f) => (
            <details key={f.title} className="rounded-2xl border border-black/10 bg-white p-5">
              <summary className="flex cursor-pointer items-center gap-3 font-bold">
                <span className="text-xl">{f.icon}</span>
                <span>{f.title}</span>
              </summary>
              <p className="mt-3 text-sm opacity-80">{f.intro}</p>
              {f.points.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2 text-sm opacity-70">
                  {f.points.map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}

          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center gap-3 font-bold">
              <span className="text-xl">💬</span>
              <span>טראבי - העוזר האישי</span>
            </div>
            <p className="mt-3 text-sm opacity-80">
              הכפתור הסגול־ורוד הצף מופיע בכל מסך. אפשר לשאול אותו כל שאלה - המלצות אוכל, איך להשתמש במסך מסוים, מה כדאי לראות מחר,
              ועוד. הוא מכיר את הנתונים האמיתיים של היעד שלכם, לא רק תשובות כלליות.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Illustrative — the app's real colors/category palette (see lib/mapStyles.ts),
 * not a literal screenshot. Numbered arrow callouts explain each region. */
function HowMapWorksDiagram() {
  return (
    <div className="overflow-hidden rounded-3xl border shadow-sm" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
      <div className="px-5 pt-5">
        <h3 className="text-lg font-bold">🗺️ איך המפה עובדת</h3>
      </div>
      <div className="relative m-5 h-80 overflow-hidden rounded-2xl" style={{ background: "#e9efe4" }}>
        <div className="absolute left-0 top-0 h-40 w-52" style={{ background: "#dbe8d8" }} />
        <div className="absolute bottom-0 right-0 h-36 w-60" style={{ background: "#e2ecdf" }} />
        <div className="absolute left-24 top-36 h-20 w-32 rounded-[40%]" style={{ background: "#cfe3cc" }} />
        <svg viewBox="0 0 480 320" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="100" x2="480" y2="130" stroke="#c9cfc0" strokeWidth="5" />
          <line x1="0" y1="230" x2="480" y2="200" stroke="#c9cfc0" strokeWidth="6" />
          <line x1="110" y1="0" x2="160" y2="320" stroke="#c9cfc0" strokeWidth="5" />
          <line x1="350" y1="0" x2="310" y2="320" stroke="#c9cfc0" strokeWidth="5" />
        </svg>

        {[
          { top: "20%", right: "65%", color: "#7C3AED" },
          { top: "42%", right: "45%", color: "#F97316" },
          { top: "30%", right: "22%", color: "#1E3A5F" },
          { top: "66%", right: "55%", color: "#16A34A" },
          { top: "74%", right: "30%", color: "#F97316" },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ top: p.top, right: p.right, background: p.color }}
          />
        ))}

        {/* open popup on the purple pin — a real info card, not just a dot,
         * so it's obvious what tapping a pin actually does */}
        <div className="absolute z-10 w-36 -translate-x-1/2" style={{ top: "-2%", right: "65%" }}>
          <div className="overflow-hidden rounded-lg bg-white shadow-lg">
            <div className="h-12 w-full" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }} />
            <div className="p-2 text-right">
              <p className="truncate text-xs font-bold">גשר קרלוס</p>
              <p className="truncate text-[10px] opacity-60">אטרקציות · 200 מ׳</p>
            </div>
          </div>
          <div className="mx-auto h-2.5 w-2.5 -translate-y-1 rotate-45 bg-white" />
        </div>
        <div className="absolute z-10 flex items-center gap-2" style={{ top: "34%", right: "6%" }}>
          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold shadow-md">1. לחיצה על סיכה = פרטים ושמירה</span>
        </div>
        {/* callout 2 — filters */}
        <div className="absolute z-10 flex items-center gap-2" style={{ top: "4%", right: "35%" }}>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold shadow" style={{ color: "#7C3AED" }}>
            2. סינון קטגוריה למעלה
          </span>
        </div>
        {/* callout 3 — chat */}
        <span
          className="absolute bottom-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-base shadow-md"
          style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
        >
          💬
        </span>
        <div className="absolute bottom-4 left-16 z-10">
          <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold shadow-md">3. טראבי תמיד זמין</span>
        </div>
      </div>
    </div>
  );
}

function HowNowWorksDiagram() {
  return (
    <div className="overflow-hidden rounded-3xl border shadow-sm" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
      <div className="px-5 pt-5">
        <h3 className="text-lg font-bold">🧭 איך "מה עכשיו" עובד</h3>
      </div>
      <div className="m-5 flex flex-col gap-3 rounded-2xl p-5" style={{ background: "#eef2ed" }}>
        <div className="relative flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
          <span className="text-xs font-bold">🧭 עוד 12 ימים לטיול</span>
          <span className="rounded-lg px-2 py-1 text-[11px] font-bold shadow" style={{ background: "#fff" }}>
            ← ספירה לאחור חיה
          </span>
        </div>
        <div className="relative flex flex-wrap gap-2">
          <span className="rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: "#7C3AED" }}>
            📍 מיקום
          </span>
          <span className="rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: "#0284C7" }}>
            🌧️ יורד גשם?
          </span>
          <span className="rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: "#DC2626" }}>
            🆘 חירום
          </span>
          <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold shadow-md">← המלצה בלחיצה אחת</span>
        </div>
        <div className="relative flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
          <span className="text-xs font-semibold">🎟️ מסעדת U Fleků</span>
          <span className="flex gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#22C55E" }}>
              ✓
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#DC2626" }}>
              ✗
            </span>
          </span>
        </div>
        <p className="text-[11px] font-bold opacity-60">↑ ✓ ירוק = הזמנתי · ✗ אדום = לא מעניין (אישי לכם בלבד)</p>
      </div>
    </div>
  );
}
