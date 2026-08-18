"use client";

import { useRef, useState, useTransition } from "react";
import { reorderItineraryDay, removeItineraryItem, setItineraryItemNote, voteItineraryItem } from "@/lib/actions/trip";

export type DayListItem = {
  id: string;
  timeOfDay: string | null;
  customLabel: string | null;
  note: string | null;
  poi: { name: string; photoUrl: string | null } | null;
  likeCount: number;
  dislikeCount: number;
  myVote: -1 | 0 | 1;
};

// How far left an item must be dragged (px) before releasing it deletes the
// stop — mirrors the swipe-builder's own reject threshold so the gesture
// feels consistent across the two screens.
const SWIPE_DELETE_THRESHOLD = 90;

// Debounced rather than saved on every keystroke, so typing a note doesn't
// fire a server action per character.
const NOTE_SAVE_DEBOUNCE_MS = 700;

export function DayItemsList({
  dayId,
  slug,
  items,
  path = "itinerary",
}: {
  dayId: string;
  slug: string;
  items: DayListItem[];
  path?: string;
}) {
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [prevItems, setPrevItems] = useState(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.note ?? ""]))
  );
  const noteSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [, startTransition] = useTransition();
  const [swipeX, setSwipeX] = useState<Record<string, number>>({});
  const swipingId = useRef<string | null>(null);
  const swipeStartX = useRef(0);

  // Keep `order`/`notes` in sync with `items` when the server sends a fresh list
  // (React's documented pattern for adjusting state during render, in place
  // of an effect that would cause an extra render). Notes already tracked
  // locally are left alone so an in-flight edit is never clobbered by a
  // revalidation triggered by something else on the page (e.g. reordering).
  if (items !== prevItems) {
    setPrevItems(items);
    const ids = items.map((i) => i.id);
    const same = order.length === ids.length && order.every((id, i) => id === ids[i]);
    if (!same) setOrder(ids);
    setNotes((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const i of items) {
        if (!(i.id in next)) {
          next[i.id] = i.note ?? "";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = order.map((id) => byId.get(id)).filter((i): i is DayListItem => Boolean(i));

  function commitOrder(next: string[]) {
    setOrder(next);
    reorderItineraryDay(dayId, next, slug, path);
  }

  function handleNoteChange(itemId: string, value: string) {
    setNotes((prev) => ({ ...prev, [itemId]: value }));
    const existing = noteSaveTimers.current.get(itemId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      startTransition(() => {
        setItineraryItemNote(itemId, value);
      });
    }, NOTE_SAVE_DEBOUNCE_MS);
    noteSaveTimers.current.set(itemId, timer);
  }

  // Pointer-based reorder (works on both mouse and touch) driven from the
  // handle icon — native HTML5 draggable doesn't fire on mobile touch, so
  // dragging via a handle with pointer events is the only reliable option.
  function handlePointerDown(itemId: string, e: React.PointerEvent) {
    e.preventDefault();
    setDragId(itemId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragId) return;
    const pointerY = e.clientY;

    setOrder((current) => {
      const dragIndex = current.indexOf(dragId);
      if (dragIndex === -1) return current;

      let targetIndex = dragIndex;
      for (let i = 0; i < current.length; i++) {
        const el = itemRefs.current.get(current[i]);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (pointerY < midpoint) {
          targetIndex = i;
          break;
        }
        targetIndex = i + 1;
      }
      if (targetIndex > dragIndex) targetIndex -= 1;
      if (targetIndex === dragIndex) return current;

      const next = current.filter((id) => id !== dragId);
      next.splice(targetIndex, 0, dragId);
      return next;
    });
  }

  function handlePointerUp() {
    if (!dragId) return;
    setDragId(null);
    if (order.join(",") !== items.map((i) => i.id).join(",")) {
      commitOrder(order);
    }
  }

  // Horizontal drag-left-to-delete on the item card itself (mobile's
  // equivalent of the swipe-builder's reject gesture). Ignores drags that
  // start on the reorder handle, note textarea, delete button, or vote
  // buttons via the `data-no-swipe` marker on those elements.
  function handleSwipePointerDown(itemId: string, e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    swipingId.current = itemId;
    swipeStartX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleSwipePointerMove(itemId: string, e: React.PointerEvent) {
    if (swipingId.current !== itemId) return;
    const delta = Math.min(0, e.clientX - swipeStartX.current);
    setSwipeX((prev) => ({ ...prev, [itemId]: delta }));
  }

  function handleSwipePointerEnd(itemId: string) {
    if (swipingId.current !== itemId) return;
    swipingId.current = null;
    const delta = swipeX[itemId] ?? 0;
    if (delta < -SWIPE_DELETE_THRESHOLD) {
      removeItineraryItem(itemId, slug);
    }
    setSwipeX((prev) => ({ ...prev, [itemId]: 0 }));
  }

  function handleVote(itemId: string, value: 1 | -1) {
    startTransition(() => {
      voteItineraryItem(itemId, value, slug);
    });
  }

  if (items.length === 0) return <p className="text-xs opacity-50">אין עדיין נקודות ביום הזה.</p>;

  return (
    <div className="flex flex-col">
      {ordered.map((item, idx) => (
        <div key={item.id} className="flex gap-2 pb-2.5 last:pb-0">
          {/* Route "trail" connector — a small stop marker plus a wavy line
           * down to the next stop. The line overflows this row's own box by
           * exactly the row gap (bottom: -0.625rem ~ pb-2.5) so it bridges
           * cleanly into the next item's dot regardless of how tall this
           * item's card is (note text can make it taller). */}
          <div className="relative w-4 shrink-0">
            <span
              className="absolute left-1/2 top-3 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--surface)" }}
            />
            {idx < ordered.length - 1 && (
              <span
                className="route-connector-line absolute left-1/2 top-3 -translate-x-1/2"
                style={{ bottom: "-0.625rem" }}
              />
            )}
          </div>

          <div className="relative flex-1 overflow-hidden rounded-xl">
            {/* Revealed behind the card as it's dragged left — mirrors the
             * delete affordance so the gesture reads clearly before release. */}
            <div
              className="absolute inset-0 flex items-center justify-start rounded-xl px-4 text-lg"
              style={{ background: "#DC2626", color: "white", opacity: Math.min(1, -(swipeX[item.id] ?? 0) / SWIPE_DELETE_THRESHOLD) }}
              aria-hidden
            >
              🗑️
            </div>
            <div
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              }}
              onPointerDown={(e) => handleSwipePointerDown(item.id, e)}
              onPointerMove={(e) => handleSwipePointerMove(item.id, e)}
              onPointerUp={() => handleSwipePointerEnd(item.id)}
              onPointerCancel={() => handleSwipePointerEnd(item.id)}
              className="relative flex items-start gap-3 rounded-xl border p-2 text-sm shadow-sm touch-pan-y"
              style={{
                borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
                background: "var(--background)",
                opacity: dragId === item.id ? 0.6 : 1,
                transform: `translateX(${swipeX[item.id] ?? 0}px)`,
                transition: swipingId.current === item.id ? "none" : "transform 0.2s ease",
              }}
            >
              <span
                data-no-swipe
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handlePointerDown(item.id, e);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="shrink-0 cursor-grab touch-none select-none px-1 pt-2 text-lg opacity-50 active:cursor-grabbing"
                aria-label="גרירה לשינוי סדר"
              >
                ⠿
              </span>
              {item.poi?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.poi.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                >
                  📍
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {item.timeOfDay && (
                  <span
                    className="w-fit rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-white"
                    style={{ background: "var(--primary)" }}
                  >
                    {item.timeOfDay}
                  </span>
                )}
                <span className="truncate font-medium">
                  {item.poi ? item.poi.name : item.customLabel}
                  {!item.poi && <span className="ms-2 text-xs opacity-50">(פריט חופשי)</span>}
                </span>
                <textarea
                  data-no-swipe
                  value={notes[item.id] ?? ""}
                  onChange={(e) => {
                    handleNoteChange(item.id, e.target.value);
                    e.currentTarget.style.height = "auto";
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                  }}
                  placeholder="✎ הוספת הערה אישית..."
                  rows={1}
                  className="mt-0.5 w-full resize-none rounded-md border-0 bg-transparent px-1.5 py-1 text-xs leading-snug opacity-80 outline-none placeholder:opacity-40 focus:bg-white/60 focus:opacity-100"
                />
                <span data-no-swipe className="mt-0.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVote(item.id, 1)}
                    className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: item.myVote === 1 ? "color-mix(in srgb, #16A34A 20%, transparent)" : "transparent",
                      color: item.myVote === 1 ? "#16A34A" : "var(--text)",
                      opacity: item.myVote === 1 ? 1 : 0.5,
                    }}
                    aria-label="לייק"
                  >
                    👍 {item.likeCount > 0 && item.likeCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote(item.id, -1)}
                    className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: item.myVote === -1 ? "color-mix(in srgb, #DC2626 20%, transparent)" : "transparent",
                      color: item.myVote === -1 ? "#DC2626" : "var(--text)",
                      opacity: item.myVote === -1 ? 1 : 0.5,
                    }}
                    aria-label="דיסלייק"
                  >
                    👎 {item.dislikeCount > 0 && item.dislikeCount}
                  </button>
                </span>
              </span>
              <form data-no-swipe action={removeItineraryItem.bind(null, item.id, slug)}>
                <button className="shrink-0 pt-2 opacity-40 hover:opacity-100">✕</button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
