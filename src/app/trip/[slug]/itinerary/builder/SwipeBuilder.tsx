"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSwipedItineraryItem, ensureItineraryDayCount, fetchAiSuggestedPois } from "@/lib/actions/trip";

type PoiCard = {
  poiId: string;
  name: string;
  categoryName: string;
  areaName: string;
  photoUrl: string | null;
  description: string | null;
  tags: string[];
  isMustSee: boolean;
};

type DeckCard = {
  key: string;
  poiId: string | null;
  name: string;
  categoryName: string;
  areaName: string | null;
  photoUrl: string | null;
  description: string | null;
  tags: string[];
  isMustSee: boolean;
  isAiSuggested?: boolean;
};

const SWIPE_COMMIT_THRESHOLD = 110;

function buildDeck(cards: PoiCard[], categories: string[], excludePoiIds: string[]): DeckCard[] {
  const excludeSet = new Set(excludePoiIds);
  const filtered = cards.filter(
    (c) => !excludeSet.has(c.poiId) && (categories.length === 0 || categories.includes(c.categoryName))
  );
  // Deterministic "popularity" ordering in lieu of real visitor-rating data:
  // must-see landmarks first, then whatever has the richest curated tags.
  const sorted = [...filtered].sort((a, b) => {
    if (a.isMustSee !== b.isMustSee) return a.isMustSee ? -1 : 1;
    return b.tags.length - a.tags.length;
  });
  return sorted.map((c) => ({ key: c.poiId, ...c }));
}

export function SwipeBuilder({
  destinationId,
  destinationName,
  slug,
  categories,
  cards,
  excludePoiIds,
  initialDayCount,
}: {
  destinationId: string;
  destinationName: string;
  slug: string;
  categories: string[];
  cards: PoiCard[];
  excludePoiIds: string[];
  initialDayCount: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"setup" | "swipe">("setup");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dayCount, setDayCount] = useState(initialDayCount);
  const [dayTotal, setDayTotal] = useState(initialDayCount);
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [index, setIndex] = useState(0);
  const [pendingCard, setPendingCard] = useState<DeckCard | null>(null);
  const [aiLoading, startAiTransition] = useTransition();
  const [, startTransition] = useTransition();
  const [starting, startStartTransition] = useTransition();

  function toggleCategory(name: string) {
    setSelectedCategories((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }

  function handleStart() {
    startStartTransition(async () => {
      await ensureItineraryDayCount(destinationId, dayCount, slug);
      setDayTotal(dayCount);
      setDeck(buildDeck(cards, selectedCategories, excludePoiIds));
      setIndex(0);
      setStep("swipe");
    });
  }

  function commitAdd(card: DeckCard, dayIndex: number) {
    startTransition(() => {
      addSwipedItineraryItem(destinationId, dayIndex, card.poiId, card.isAiSuggested ? card.name : null, slug);
    });
  }

  function handleReject() {
    setIndex((i) => i + 1);
  }

  function handleAccept(card: DeckCard) {
    setPendingCard(card);
  }

  function pickDay(dayIndex: number) {
    if (pendingCard) commitAdd(pendingCard, dayIndex);
    setPendingCard(null);
    setIndex((i) => i + 1);
  }

  function requestMoreFromAi() {
    startAiTransition(async () => {
      const excludeNames = [...deck.map((c) => c.name), ...cards.map((c) => c.name)];
      const suggestions = await fetchAiSuggestedPois(destinationName, selectedCategories, excludeNames);
      const newCards: DeckCard[] = suggestions.map((s) => ({
        key: `ai-${s.name}-${Math.random().toString(36).slice(2)}`,
        poiId: null,
        name: s.name,
        categoryName: selectedCategories[0] ?? "מומלץ",
        areaName: null,
        photoUrl: null,
        description: s.description,
        tags: [],
        isMustSee: false,
        isAiSuggested: true,
      }));
      setDeck((prev) => [...prev, ...newCards]);
    });
  }

  const current = deck[index];
  const next = deck[index + 1];
  const exhausted = step === "swipe" && !current;

  if (step === "setup") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">🔥 בניית מסלול במצב טינדר</h1>
          <button onClick={() => router.push(`/trip/${slug}/itinerary`)} className="text-2xl opacity-50 hover:opacity-100" aria-label="סגירה">
            ✕
          </button>
        </div>
        <p className="text-sm opacity-70">
          בחרו את תחומי העניין שלכם ומספר ימי הטיול — לאחר מכן נעביר לכם כרטיסיות של אטרקציות אחת-אחת: גררו ימינה כדי להוסיף למסלול, שמאלה כדי לדלג.
        </p>

        <div>
          <p className="mb-2 text-sm font-semibold">תחומי עניין (השאירו הכל ריק כדי לכלול הכל)</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = selectedCategories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    borderColor: "var(--primary)",
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "white" : "var(--text)",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="dayCount">
            כמה ימי טיול?
          </label>
          <input
            id="dayCount"
            type="number"
            min={1}
            max={30}
            value={dayCount}
            onChange={(e) => setDayCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="w-24 rounded-lg border px-3 py-2 text-center text-lg font-bold"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", background: "var(--surface)" }}
          />
        </div>

        <button
          onClick={handleStart}
          disabled={starting}
          className="rounded-full px-6 py-3 text-base font-bold text-white shadow-md disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #F472B6, #F59E0B)" }}
        >
          {starting ? "טוען…" : "🚀 בואו נתחיל!"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-4">
      <div className="flex w-full items-center justify-between">
        <span className="text-xs opacity-60">
          {exhausted ? "סוף הכרטיסיות" : `כרטיס ${index + 1} מתוך ${deck.length}`}
        </span>
        <button onClick={() => router.push(`/trip/${slug}/itinerary`)} className="text-2xl opacity-50 hover:opacity-100" aria-label="סגירה">
          ✕
        </button>
      </div>

      {exhausted ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-2xl">🎉</p>
          <p className="font-semibold">עברתם על כל הנקודות בקטגוריות שבחרתם</p>
          <button
            onClick={requestMoreFromAi}
            disabled={aiLoading}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {aiLoading ? "מחפש הצעות…" : "✨ בקשו עוד הצעות מ-AI"}
          </button>
          <button
            onClick={() => router.push(`/trip/${slug}/itinerary`)}
            className="rounded-full border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
          >
            סיימתי, חזרה למסלול
          </button>
        </div>
      ) : (
        <SwipeCardStack current={current} next={next} onAccept={handleAccept} onReject={handleReject} />
      )}

      {pendingCard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setPendingCard(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ background: "var(--surface)" }}
          >
            <p className="mb-3 text-center font-bold">לאיזה יום להוסיף את &quot;{pendingCard.name}&quot;?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: dayTotal }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  onClick={() => pickDay(d)}
                  className="rounded-full px-4 py-2 text-sm font-bold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  יום {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SwipeCardStack({
  current,
  next,
  onAccept,
  onReject,
}: {
  current: DeckCard;
  next?: DeckCard;
  onAccept: (card: DeckCard) => void;
  onReject: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  }
  function commit(direction: "left" | "right") {
    setDragging(false);
    setDragX(direction === "right" ? 700 : -700);
    setTimeout(() => {
      setDragX(0);
      if (direction === "right") onAccept(current);
      else onReject();
    }, 160);
  }
  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_COMMIT_THRESHOLD) commit("right");
    else if (dragX < -SWIPE_COMMIT_THRESHOLD) commit("left");
    else setDragX(0);
  }

  const rotate = dragX / 18;
  const hint = dragX > 40 ? "right" : dragX < -40 ? "left" : null;

  return (
    <div className="relative h-[500px] w-full">
      {next && (
        <div className="absolute inset-0" style={{ transform: "scale(0.94) translateY(12px)", opacity: 0.6 }}>
          <CardFace card={next} />
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        style={{
          transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
          transition: dragging ? "none" : "transform 0.25s ease",
        }}
      >
        <CardFace card={current} hint={hint} />
      </div>

      <div className="absolute inset-x-0 -bottom-2 flex translate-y-full justify-center gap-6 pt-4">
        <button
          onClick={() => commit("left")}
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg"
          style={{ background: "var(--surface)", border: "2px solid #DC2626", color: "#DC2626" }}
          aria-label="דילוג"
        >
          ✕
        </button>
        <button
          onClick={() => commit("right")}
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg"
          style={{ background: "var(--surface)", border: "2px solid #16A34A", color: "#16A34A" }}
          aria-label="הוספה למסלול"
        >
          ❤️
        </button>
      </div>
    </div>
  );
}

function CardFace({ card, hint }: { card: DeckCard; hint?: "left" | "right" | null }) {
  const popularity = card.isAiSuggested
    ? "✨ הצעת AI"
    : card.isMustSee
      ? "⭐ חובה לראות"
      : card.tags.length >= 3
        ? "🔥 פופולרי בקרב מטיילים"
        : null;

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-3xl border shadow-xl"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", background: "var(--surface)" }}
    >
      <div className="relative h-64 shrink-0">
        {card.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photoUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div
            className="flex h-full items-center justify-center text-5xl"
            style={{ background: `linear-gradient(135deg, var(--primary), var(--secondary))` }}
          >
            🗺️
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute bottom-3 right-4 text-xl font-extrabold text-white drop-shadow">{card.name}</span>
        {hint && (
          <span
            className="absolute top-4 rounded-lg border-4 px-3 py-1 text-xl font-extrabold uppercase"
            style={{
              [hint === "right" ? "left" : "right"]: "1rem",
              borderColor: hint === "right" ? "#16A34A" : "#DC2626",
              color: hint === "right" ? "#16A34A" : "#DC2626",
              transform: `rotate(${hint === "right" ? "-12deg" : "12deg"})`,
              background: "rgba(255,255,255,0.85)",
            }}
          >
            {hint === "right" ? "מוסיפים" : "מדלגים"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full px-2 py-1 font-semibold" style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            {card.categoryName}
          </span>
          {card.areaName && <span className="opacity-60">{card.areaName}</span>}
        </div>
        {popularity && <p className="text-sm font-semibold">{popularity}</p>}
        {card.description && <p className="text-sm opacity-75">{card.description}</p>}
        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.tags.slice(0, 5).map((t) => (
              <span key={t} className="rounded-full px-2 py-0.5 text-[11px] opacity-70" style={{ background: "var(--background)" }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
