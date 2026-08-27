"use client";

import { useState } from "react";
import { saveMapPin } from "@/lib/actions/trip";
import { SAVED_PIN_CATEGORY_OPTIONS } from "@/lib/mapStyles";

export type PendingSavePin = { placeId: string; name: string; lat: number; lng: number };

/** Opened from the "💾 שמירה למפה" button (on a native Google POI or the
 * user's own personal pin) instead of saving immediately — lets them curate
 * it the same way an admin curates a KML point (name, description, photo,
 * category) so it renders with the app's own categoryMarkerIcon() instead of
 * a generic default marker once saved. */
export function SavePinModal({
  destinationId,
  slug,
  pin,
  onClose,
}: {
  destinationId: string;
  slug: string;
  pin: PendingSavePin;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    await saveMapPin(destinationId, slug, formData);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <form
        action={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--surface)" }}
      >
        <h2 className="text-lg font-bold">💾 שמירת נקודה למפה שלי</h2>

        <input type="hidden" name="placeId" value={pin.placeId} />
        <input type="hidden" name="lat" value={pin.lat} />
        <input type="hidden" name="lng" value={pin.lng} />

        <label className="text-xs opacity-60">
          שם
          <input
            name="name"
            defaultValue={pin.name}
            required
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
        </label>

        <label className="text-xs opacity-60">
          קטגוריה (קובעת את האייקון והצבע - כמו בשאר הנקודות במפה)
          <select
            name="categoryName"
            defaultValue={SAVED_PIN_CATEGORY_OPTIONS[SAVED_PIN_CATEGORY_OPTIONS.length - 1]}
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--primary)" }}
          >
            {SAVED_PIN_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs opacity-60">
          תיאור (רשות)
          <textarea
            name="description"
            rows={3}
            placeholder="למה שמרתם את הנקודה הזו?"
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
        </label>

        <label className="text-xs opacity-60">
          תמונה (רשות)
          <input
            name="photo"
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm"
          />
        </label>

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
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
      </form>
    </div>
  );
}
