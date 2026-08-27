"use client";

import { useRef, useState, useTransition } from "react";
import { reorderItineraryDay, removeItineraryItem, setItineraryItemNote, voteItineraryItem } from "@/lib/actions/trip";
import { shortCategoryLabel } from "@/lib/categoryLabels";

export type DayListItem = {
  id: string;
  timeOfDay: string | null;
  customLabel: string | null;
  note: string | null;
  poi: { name: string; photoUrl: string | null; categoryName?: string; description?: string | null } | null;
  likeCount: number;
  dislikeCount: number;
  myVote: -1 | 0 | 1;
};

// How far left an item must be dragged (px) before releasing it deletes the
// stop — mirrors the swipe-builder's own reject threshold so the gesture
// feels consistent across the two screens.
const SWIPE_DELETE_THRESHOLD = 90;

/** "Where am I" cue: the last time-stamped stop at or before right-now is
 * highlighted green (currently happening), the next one after it gets a
 * lighter accent (coming up) — purely a clock-time comparison against each
 * stop's timeOfDay, not validated against which calendar day the trip is
 * actually on, so it's a same-schedule-shape cue rather than a literal
 * "you're here today" guarantee. Same logic the map's route view and the
 * Now screen already use, kept in sync deliberately. */
function timeStatusMap(items: { id: string; timeOfDay: string | null }[]): Map<string, "current" | "next"> {
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const map = new Map<string, "current" | "next">();
  let currentId: string | null = null;
  let nextId: string | null = null;
  for (const item of items) {
    if (!item.timeOfDay) continue;
    const [h, m] = item.timeOfDay.split(":").map(Number);
    const minutes = h * 60 + m;
    if (minutes <= nowMinutes) currentId = item.id;
    else if (!nextId) nextId = item.id;
  }
  if (currentId) map.set(currentId, "current");
  if (nextId) map.set(nextId, "next");
  return map;
}

/** "קטגוריה · שם" — the Hebrew category always comes first purely for
 * accessibility (immediately clear whether a stop is a restaurant, bar,
 * attraction... before reading the venue name, which is very often in
 * English/the local language and gives no hint on its own). */
function displayLabel(item: DayListItem): string {
  const name = item.poi ? item.poi.name : (item.customLabel ?? "");
  if (!item.poi?.categoryName) return name;
  return `${shortCategoryLabel(item.poi.categoryName)} · ${name}`;
}

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
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

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
  // start on the reorder handle via the `data-no-swipe` marker.
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
    setSwipeX((prev) => ({ ...prev, [itemId]: 0 }));
    if (delta < -SWIPE_DELETE_THRESHOLD) {
      removeItineraryItem(itemId, slug);
      return;
    }
    // A swipe too small to count as a delete gesture is treated as a tap —
    // opens the detail sheet, same as tapping the card normally would.
    if (Math.abs(delta) < 6) setDetailItemId(itemId);
  }

  function handleVote(itemId: string, value: 1 | -1) {
    startTransition(() => {
      voteItineraryItem(itemId, value, slug);
    });
  }

  if (items.length === 0) return <p className="text-xs opacity-50">אין עדיין נקודות ביום הזה.</p>;

  const timeStatus = timeStatusMap(ordered);
  const detailItem = detailItemId ? byId.get(detailItemId) ?? null : null;

  return (
    <div className="flex flex-col">
      {ordered.map((item) => {
        const status = timeStatus.get(item.id);
        return (
          <div key={item.id} className="pb-2 last:pb-0">
            <div className="relative overflow-hidden rounded-2xl">
              {/* Revealed behind the card as it's dragged left — mirrors the
               * delete affordance so the gesture reads clearly before release. */}
              <div
                className="absolute inset-0 flex items-center justify-start rounded-2xl px-4 text-lg"
                style={{ background: "#E11D48", color: "white", opacity: Math.min(1, -(swipeX[item.id] ?? 0) / SWIPE_DELETE_THRESHOLD) }}
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
                className="relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-2xl border p-3 text-sm shadow-sm touch-pan-y"
                style={{
                  borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
                  background: "var(--surface)",
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
                  className="shrink-0 cursor-grab touch-none select-none px-0.5 text-base opacity-30 active:cursor-grabbing"
                  aria-label="גרירה לשינוי סדר"
                >
                  ⠿
                </span>

                {item.timeOfDay && (
                  <span
                    className="shrink-0 rounded-full px-2 py-1 font-mono text-xs font-bold text-white"
                    style={{ background: status === "current" ? "#22C55E" : "var(--primary)" }}
                  >
                    {item.timeOfDay}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{displayLabel(item)}</span>
                {status === "current" && (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#22C55E" }}>
                    עכשיו
                  </span>
                )}
                {status === "next" && (
                  <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ color: "#B45309", background: "color-mix(in srgb, #F59E0B 14%, transparent)" }}>
                    הבא
                  </span>
                )}
                {notes[item.id] && <span className="shrink-0 text-xs opacity-40">✎</span>}
              </div>
            </div>
          </div>
        );
      })}

      {detailItem && (
        <ItemDetailSheet
          item={detailItem}
          note={notes[detailItem.id] ?? ""}
          onNoteChange={(v) => handleNoteChange(detailItem.id, v)}
          onVote={(v) => handleVote(detailItem.id, v)}
          onRemove={() => {
            removeItineraryItem(detailItem.id, slug);
            setDetailItemId(null);
          }}
          onClose={() => setDetailItemId(null)}
        />
      )}
    </div>
  );
}

/** Opens on tap — everything that used to live inline in the row (note,
 * votes, remove) now lives here instead, keeping the row itself clean. */
function ItemDetailSheet({
  item,
  note,
  onNoteChange,
  onVote,
  onRemove,
  onClose,
}: {
  item: DayListItem;
  note: string;
  onNoteChange: (value: string) => void;
  onVote: (value: 1 | -1) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[75vh] w-full max-w-xs flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {item.poi?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.poi.photoUrl} alt="" className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-14 w-full items-center justify-center text-2xl" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            📍
          </div>
        )}
        <div className="flex flex-col gap-2.5 overflow-y-auto p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {item.poi?.categoryName && <p className="text-[11px] font-semibold opacity-60">{shortCategoryLabel(item.poi.categoryName)}</p>}
              <h2 className="truncate text-sm font-bold">{item.poi ? item.poi.name : item.customLabel}</h2>
              {item.timeOfDay && <p className="mt-0.5 text-xs font-bold" style={{ color: "var(--primary)" }}>{item.timeOfDay}</p>}
            </div>
            <button onClick={onClose} className="shrink-0 rounded-full px-1.5 py-0.5 text-base opacity-50 hover:opacity-100" aria-label="סגירה">
              ✕
            </button>
          </div>

          {item.poi?.description && <p className="text-xs opacity-80">{item.poi.description}</p>}

          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="✎ הוספת הערה אישית..."
            rows={2}
            className="w-full resize-none rounded-lg border p-1.5 text-xs outline-none"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onVote(1)}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                style={{
                  background: item.myVote === 1 ? "color-mix(in srgb, #16A34A 20%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: item.myVote === 1 ? "#16A34A" : "var(--text)",
                }}
              >
                👍 {item.likeCount > 0 && item.likeCount}
              </button>
              <button
                onClick={() => onVote(-1)}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                style={{
                  background: item.myVote === -1 ? "color-mix(in srgb, #DC2626 20%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: item.myVote === -1 ? "#DC2626" : "var(--text)",
                }}
              >
                👎 {item.dislikeCount > 0 && item.dislikeCount}
              </button>
            </div>
            <button onClick={onRemove} className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: "#DC2626" }}>
              🗑️ הסרה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
