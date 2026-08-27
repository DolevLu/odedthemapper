"use client";

import { useState } from "react";
import { updatePoiStyle, deletePoi } from "@/lib/actions/trip";
import { SAVED_PIN_CATEGORY_OPTIONS } from "@/lib/mapStyles";

export type EditablePin = { id: string; name: string; colorHex: string | null; iconCategory: string | null; isShape: boolean };

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updatePoiStyle(pin.id, destinationId, slug, {
      colorHex: useCustomColor ? color : null,
      iconCategory: iconCategory || null,
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
