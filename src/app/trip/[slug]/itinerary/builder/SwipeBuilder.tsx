"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addSwipedItineraryItem,
  ensureItineraryDayCount,
  fetchAiSuggestedPois,
  buildSwipeDeck,
  type SwipeDeckCard,
} from "@/lib/actions/trip";
import { useSaveOrDiscardFlow } from "@/hooks/useSaveOrDiscardFlow";

type DeckCard = Omit<SwipeDeckCard, "poiId" | "areaName"> & {
  key: string;
  poiId: string | null;
  areaName: string | null;
  isAiSuggested?: boolean;
};

const SWIPE_COMMIT_THRESHOLD = 80;
const DAY_ITEM_CAP = 10;

export function SwipeBuilder({
  destinationId,
  destinationName,
  slug,
  categories,
  excludePoiIds,
  initialDayCount,
  hasExistingDays,
  existingDayItemCounts,
}: {
  destinationId: string;
  destinationName: string;
  slug: string;
  categories: string[];
  excludePoiIds: string[];
  initialDayCount: number;
  hasExistingDays: boolean;
  existingDayItemCounts: number[];
}) {
  const router = useRouter();
  const { requestConfirm, modal: confirmModal } = useSaveOrDiscardFlow(destinationId, slug);
  const [step, setStep] = useState<"setup" | "swipe">("setup");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dayCount, setDayCount] = useState(initialDayCount);
  const [dayTotal, setDayTotal] = useState(initialDayCount);
  const [dayCounts, setDayCounts] = useState<number[]>(existingDayItemCounts);
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [index, setIndex] = useState(0);
  const [pendingCard, setPendingCard] = useState<DeckCard | null>(null);
  const [aiLoading, startAiTransition] = useTransition();
  const [, startTransition] = useTransition();
  const [starting, startStartTransition] = useTransition();

  function toggleCategory(name: string) {
    setSelectedCategories((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }

  function beginBuild() {
    startStartTransition(async () => {
      await ensureItineraryDayCount(destinationId, dayCount, slug);
      const freshDeck = await buildSwipeDeck(destinationId, selectedCategories, excludePoiIds);
      setDayTotal(dayCount);
      setDayCounts((prev) => Array.from({ length: dayCount }, (_, i) => prev[i] ?? 0));
      setDeck(freshDeck.map((c) => ({ ...c, key: c.poiId })));
      setIndex(0);
      setStep("swipe");
    });
  }

  function handleStart() {
    requestConfirm(hasExistingDays, beginBuild, { allowContinue: true });
  }

  // Optimistic: advances the deck and closes the day-picker immediately
  // instead of waiting on the server round-trip, which was the actual cause
  // of "adding to a day feels slow" — the day-fullness check already runs
  // client-side (full days are disabled below), so the server call failing
  // here is the rare exception, not the common case, and is safe to just
  // roll back if it does.
  function commitAdd(card: DeckCard, dayIndex: number) {
    setDayCounts((prev) => prev.map((c, i) => (i === dayIndex - 1 ? c + 1 : c)));
    setPendingCard(null);
    setIndex((i) => i + 1);
    startTransition(async () => {
      const result = await addSwipedItineraryItem(
        destinationId,
        dayIndex,
        card.poiId,
        card.isAiSuggested ? card.name : null,
        slug
      );
      if (result && "error" in result) {
        setDayCounts((prev) => prev.map((c, i) => (i === dayIndex - 1 ? Math.max(0, c - 1) : c)));
        window.alert(result.error);
      }
    });
  }

  function handleReject() {
    setIndex((i) => i + 1);
  }

  function handleAccept(card: DeckCard) {
    setPendingCard(card);
  }

  function requestMoreFromAi() {
    startAiTransition(async () => {
      const excludeNames = [...deck.map((c) => c.name)];
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

        {confirmModal}
      </div>
    );
  }

  return (
    // Fixed to fill the viewport below the header (same pattern as the map
    // screen) instead of flowing in-page — a fixed-height card + button row
    // that doesn't need scrolling to reach the ❤️/✕ controls was the fix for
    // both "have to scroll to see like/dislike" and a mis-tap on the mobile
    // bottom nav underneath registering as an accidental exit to the map.
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-10 flex flex-col items-center gap-3 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-4 sm:relative sm:inset-auto sm:bottom-auto sm:top-auto sm:h-[calc(100vh-160px)] sm:pb-4"
      style={{ background: "var(--background)" }}
    >
      <div className="flex w-full max-w-md items-center justify-between">
        <span className="text-xs opacity-60">{exhausted ? "סוף הכרטיסיות" : `כרטיס ${index + 1} מתוך ${deck.length}`}</span>
        <button onClick={() => router.push(`/trip/${slug}/itinerary`)} className="text-2xl opacity-50 hover:opacity-100" aria-label="סגירה">
          ✕
        </button>
      </div>

      {exhausted ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
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
        <div className="flex min-h-0 w-full max-w-md flex-1 flex-col justify-center gap-4">
          <SwipeCardStack current={current} next={next} onAccept={handleAccept} onReject={handleReject} />
        </div>
      )}

      {pendingCard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setPendingCard(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-5" style={{ background: "var(--surface)" }}>
            <p className="mb-3 text-center font-bold">לאיזה יום להוסיף את &quot;{pendingCard.name}&quot;?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: dayTotal }, (_, i) => i + 1).map((d) => {
                const count = dayCounts[d - 1] ?? 0;
                const full = count >= DAY_ITEM_CAP;
                return (
                  <button
                    key={d}
                    onClick={() => !full && commitAdd(pendingCard, d)}
                    disabled={full}
                    className="rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                    style={{ background: full ? "#9CA3AF" : "var(--primary)" }}
                  >
                    יום {d} {full ? "(מלא)" : `(${count}/${DAY_ITEM_CAP})`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {confirmModal}
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
    }, 140);
  }
  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_COMMIT_THRESHOLD) commit("right");
    else if (dragX < -SWIPE_COMMIT_THRESHOLD) commit("left");
    else setDragX(0);
  }

  const rotate = dragX / 18;
  const hint = dragX > 30 ? "right" : dragX < -30 ? "left" : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative min-h-0 flex-1">
        {next && (
          <div className="absolute inset-0" style={{ transform: "scale(0.94) translateY(10px)", opacity: 0.6 }}>
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
            touchAction: "none",
            transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
            transition: dragging ? "none" : "transform 0.22s ease",
          }}
        >
          <CardFace card={current} hint={hint} />
        </div>
      </div>

      <div className="flex shrink-0 justify-center gap-6">
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
      <div className="relative h-[45%] shrink-0">
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
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute bottom-2 right-4 text-lg font-extrabold text-white drop-shadow">{card.name}</span>
        {hint && (
          <span
            className="absolute top-3 rounded-lg border-4 px-2.5 py-0.5 text-lg font-extrabold uppercase"
            style={{
              [hint === "right" ? "left" : "right"]: "0.75rem",
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
      {/* No overflow-y-auto here on purpose — a scrollable region inside the
       * draggable card competed with the swipe gesture for touch events on
       * some browsers, making left/right drags feel unreliable when started
       * over the description text. Content is short (truncated to ~160
       * chars) so it fits without needing to scroll. */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-3.5">
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
