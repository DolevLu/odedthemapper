"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SEEN_KEY = "oded-walkthrough-seen-v1";

type Step = { path: string | null; icon: string; title: string; body: string };

function buildSteps(): Step[] {
  return [
    {
      path: null,
      icon: "👋",
      title: "ברוכים הבאים לעודד המנקד!",
      body: "בואו נעשה סיור קצר של 7 צעדים באפליקציה - פחות מדקה, ותדעו בדיוק איפה למצוא הכל.",
    },
    {
      path: "/now",
      icon: "🧭",
      title: "מה עכשיו",
      body: "כאן תמיד תמצאו המלצות רלוונטיות לפי המיקום שלכם, זמן מקומי מול זמן הבית, ומידע חירום (שקעים, ויזה, טיפים) בלחיצה אחת.",
    },
    {
      path: "",
      icon: "🗺️",
      title: "המפה האינטראקטיבית",
      body: "כל הנקודות המומלצות על המפה, בצבע לפי קטגוריה. לוחצים על סיכה כדי לראות פרטים ולהוסיף למועדפים.",
    },
    {
      path: "/itinerary",
      icon: "📅",
      title: "בניית מסלול",
      body: "בנו מסלול יום־אחר־יום, או נסו את מסלול הטינדר 🔥 - מחליקים ימין/שמאל על מקומות ובונים מסלול אוטומטית (אפשר גם להמשיך ולהרחיב מסלול קיים).",
    },
    {
      path: "/favorites",
      icon: "❤️",
      title: "מועדפים והזמנות",
      body: "כל מה שסימנתם נשמר כאן, ותוכלו למצוא גם אטרקציות מומלצות להזמנה מראש עם קישורים ישירים.",
    },
    {
      path: "/expenses",
      icon: "💸",
      title: "הוצאות ולוגיסטיקה",
      body: "עקבו אחרי התקציב עם ממיר מטבעות מובנה, ושמרו את פרטי הטיסות והמלונות שלכם במסך הלוגיסטיקה.",
    },
    {
      path: null,
      icon: "💬",
      title: "טראבי - העוזר האישי שלכם",
      body: "בכל מסך תמצאו את הכפתור הסגול־ורוד הזה. טראבי יודע להמליץ, לענות על שאלות ולעזור לתכנן - תרגישו חופשי להתייעץ איתו לאורך כל הטיול!",
    },
  ];
}

export function WalkthroughGuide({ slug }: { slug: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const steps = buildSteps();

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) setShow(true);
  }, []);

  function close() {
    localStorage.setItem(SEEN_KEY, "1");
    setShow(false);
  }

  function goToStep(next: number) {
    const target = steps[next];
    if (target?.path !== null && target?.path !== undefined) {
      router.push(`/trip/${slug}${target.path}`);
    }
    setStep(next);
  }

  if (!show) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={(e) => e.stopPropagation()}>
      <div
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--surface)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-5 rounded-full"
                style={{ background: i <= step ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)" }}
              />
            ))}
          </div>
          <button onClick={close} className="text-sm opacity-50 hover:opacity-100" aria-label="דלג על ההדרכה">
            ✕ דלג
          </button>
        </div>

        <div className="mb-4 text-center">
          <div className="mb-2 text-4xl">{current.icon}</div>
          <h2 className="mb-1.5 text-lg font-bold">{current.title}</h2>
          <p className="text-sm opacity-70">{current.body}</p>
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={() => goToStep(step - 1)}
              className="rounded-full border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
            >
              הקודם
            </button>
          )}
          <button
            onClick={() => (isLast ? close() : goToStep(step + 1))}
            className="flex-1 rounded-full px-4 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--primary)" }}
          >
            {isLast ? "סיימתי, תודה! 🎉" : step === 0 ? "בואו נתחיל ←" : "הבא ←"}
          </button>
        </div>
      </div>
    </div>
  );
}
