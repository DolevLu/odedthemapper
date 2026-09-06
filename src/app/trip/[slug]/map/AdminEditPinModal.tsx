"use client";

import { useState } from "react";
import { updatePoiStyle, deletePoi } from "@/lib/actions/trip";
import { SAVED_PIN_CATEGORY_OPTIONS, RESTAURANT_CATEGORY_MATCH } from "@/lib/mapStyles";
import { DIETARY_FILTERS, type DietaryFilterKey } from "@/components/KosherStar";

export type EditablePin = {
  id: string;
  name: string;
  colorHex: string | null;
  iconCategory: string | null;
  isShape: boolean;
  /** The POI's real underlying category (not the display-only iconCategory
   * override) — whether to show the dietary sub-selection checks THIS, since
   * an admin restyling a non-restaurant point's icon shouldn't suddenly gain
   * "kosher/vegetarian" checkboxes that have nothing to do with it. */
  categoryName?: string;
  tags?: string[];
};

const DEFAULT_PICKER_COLOR = "#7C3AED";

/** Admin-only: lets a content manager override any existing point/shape's
 * marker color and (for points) icon, from the map itself — a real color
 * picker rather than the fixed palette SavePinModal offers new personal
 * pins, since this is deliberately meant to allow any color, not just the
 * app's standard categories. */
export function AdminEditPinModal({
  destinationId,
  slug,
  pin,
  onClose,
}: {
  destinationId: string;
  slug: string;
  pin: EditablePin;
  onClose: () => void;
}) {
  const [useCustomColor, setUseCustomColor] = useState(Boolean(pin.colorHex));
  const [color, setColor] = useState(pin.colorHex ?? DEFAULT_PICKER_COLOR);
  const [iconCategory, setIconCategory] = useState(pin.iconCategory ?? "");
  const [dietaryTags, setDietaryTags] = useState<Set<DietaryFilterKey>>(
    () => new Set(DIETARY_FILTERS.filter((f) => pin.tags?.some((t) => f.match.test(t))).map((f) => f.key))
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isRestaurant = RESTAURANT_CATEGORY_MATCH.test(pin.categoryName ?? "");

  async function handleSave() {
    setSaving(true);
    await updatePoiStyle(pin.id, destinationId, slug, {
      colorHex: useCustomColor ? color : null,
      iconCategory: iconCategory || null,
      ...(isRestaurant ? { dietaryTags: DIETARY_FILTERS.filter((f) => dietaryTags.has(f.key)).map((f) => f.label) } : {}),
    });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!window.confirm(`למחוק את "${pin.name}" לצמיתות מהמפה?`)) return;
    setDeleting(true);
    await deletePoi(pin.id, destinationId, slug);
    setDeleting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">
            🎨 עריכת צבע{!pin.isShape && "/אייקון"} - {pin.name}
          </h2>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm disabled:opacity-50"
            style={{ background: "#FEE2E2", color: "#DC2626" }}
            title="הסרת הנקודה מהמפה"
            aria-label="הסרת הנקודה מהמפה"
          >
            🗑️
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useCustomColor} onChange={(e) => setUseCustomColor(e.target.checked)} />
          צבע מותאם אישית (במקום ברירת המחדל לפי קטגוריה)
        </label>
        {useCustomColor && (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-16 cursor-pointer rounded-lg border"
              style={{ borderColor: "var(--primary)" }}
              aria-label="בחירת צבע"
            />
            <span className="font-mono text-sm opacity-70">{color}</span>
          </div>
        )}

        {!pin.isShape && (
          <label className="text-xs opacity-60">
            אייקון (קובע גם צבע ברירת מחדל אם אין צבע מותאם אישית)
            <select
              value={iconCategory}
              onChange={(e) => setIconCategory(e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--primary)" }}
            >
              <option value="">ברירת מחדל (לפי הקטגוריה האמיתית של הנקודה)</option>
              {SAVED_PIN_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}

        {isRestaurant && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs opacity-60">מאפייני תזונה (רשות)</span>
            <div className="flex flex-wrap gap-2">
              {DIETARY_FILTERS.map((f) => (
                <label
                  key={f.key}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                  style={{ borderColor: "var(--primary)" }}
                >
                  <input
                    type="checkbox"
                    checked={dietaryTags.has(f.key)}
                    onChange={() =>
                      setDietaryTags((prev) => {
                        const next = new Set(prev);
                        if (next.has(f.key)) next.delete(f.key);
                        else next.add(f.key);
                        return next;
                      })
                    }
                  />
                  {f.icon} {f.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            {saving ? "שומר…" : "שמירה"}
          </button>
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-sm opacity-60">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
