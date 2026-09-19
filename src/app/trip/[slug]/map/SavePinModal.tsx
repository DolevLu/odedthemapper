"use client";

import { useState } from "react";
import { saveMapPin } from "@/lib/actions/trip";
import { SAVED_PIN_CATEGORY_OPTIONS, RESTAURANT_CATEGORY_MATCH } from "@/lib/mapStyles";
import { DIETARY_FILTERS } from "@/components/KosherStar";
import { useTranslation } from "@/components/i18n/LanguageContext";

export type PendingSavePin = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  /** Present when reopening this modal to edit an already-saved personal pin
   * (as opposed to saving a brand-new Google POI) — prefills the form, and
   * since saveMapPin upserts on (userId, destinationId, placeId), resaving
   * with the same placeId updates the existing SavedMapPin in place. */
  description?: string | null;
  photoUrl?: string | null;
  categoryName?: string | null;
  /** Everything Google showed for this place - posted with the form so a
   * single click on Save keeps all of it. Absent when editing an existing pin. */
  google?: {
    address: string | null;
    phone: string | null;
    website: string | null;
    url: string | null;
    photoUrl: string | null;
    rating: number | null;
    ratingCount: number | null;
    hours: string[] | null;
    suggestedCategory: string | null;
  };
};

/** Opened from the "💾 שמירה למפה" button (on a native Google POI or the
 * user's own personal pin) instead of saving immediately — lets them curate
 * it the same way an admin curates a KML point (name, description, photo,
 * category) so it renders with the app's own categoryMarkerIcon() instead of
 * a generic default marker once saved. */
export function SavePinModal({
  destinationId,
  slug,
  pin,
  isAdmin = false,
  onClose,
}: {
  destinationId: string;
  slug: string;
  pin: PendingSavePin;
  /** The dietary checkboxes only matter for a real shared POI (the admin
   * branch of saveMapPin) — a non-admin's SavedMapPin has no tags to attach
   * them to, so showing checkboxes that silently do nothing would just be
   * confusing. */
  isAdmin?: boolean;
  onClose: () => void;
}) {
  const isEditing = pin.description !== undefined || pin.photoUrl !== undefined || pin.categoryName !== undefined;
  const [saving, setSaving] = useState(false);
  const [categoryName, setCategoryName] = useState(
    pin.categoryName ?? pin.google?.suggestedCategory ?? SAVED_PIN_CATEGORY_OPTIONS[SAVED_PIN_CATEGORY_OPTIONS.length - 1]
  );
  const g = pin.google;
  const isRestaurant = isAdmin && RESTAURANT_CATEGORY_MATCH.test(categoryName);
  const { t } = useTranslation();

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
        <h2 className="text-lg font-bold">{isEditing ? t("savePin.editTitle") : t("savePin.saveTitle")}</h2>

        <input type="hidden" name="placeId" value={pin.placeId} />
        <input type="hidden" name="lat" value={pin.lat} />
        <input type="hidden" name="lng" value={pin.lng} />
        {g && (
          <>
            <input type="hidden" name="g_address" value={g.address ?? ""} />
            <input type="hidden" name="g_phone" value={g.phone ?? ""} />
            <input type="hidden" name="g_website" value={g.website ?? ""} />
            <input type="hidden" name="g_url" value={g.url ?? ""} />
            <input type="hidden" name="g_photo" value={g.photoUrl ?? ""} />
            <input type="hidden" name="g_rating" value={g.rating ?? ""} />
            <input type="hidden" name="g_ratingCount" value={g.ratingCount ?? ""} />
            <input type="hidden" name="g_hours" value={JSON.stringify(g.hours ?? [])} />
            <div className="flex gap-3 rounded-xl border p-2.5 text-xs" style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
              {g.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">{t("savePin.keepsAll")}</p>
                <p className="opacity-60">
                  {[g.rating != null ? "\u2B50 " + g.rating : null, g.address, g.phone, g.website ? "\uD83C\uDF10" : null].filter(Boolean).join(" \u00B7 ")}
                </p>
              </div>
            </div>
          </>
        )}

        <label className="text-xs opacity-60">
          {t("savePin.nameLabel")}
          <input
            name="name"
            defaultValue={pin.name}
            required
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
        </label>

        <label className="text-xs opacity-60">
          {t("savePin.categoryLabel")}
          <select
            name="categoryName"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
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

        {isRestaurant && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs opacity-60">{t("savePin.dietaryLabel")}</span>
            <div className="flex flex-wrap gap-2">
              {DIETARY_FILTERS.map((f) => (
                <label
                  key={f.key}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                  style={{ borderColor: "var(--primary)" }}
                >
                  <input type="checkbox" name="dietaryTags" value={f.label} />
                  {f.icon} {f.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="text-xs opacity-60">
          {t("savePin.descriptionLabel")}
          <textarea
            name="description"
            rows={3}
            defaultValue={pin.description ?? ""}
            placeholder={t("savePin.descriptionPlaceholder")}
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
        </label>

        <label className="text-xs opacity-60">
          {t("savePin.photoLabel")}
          {isEditing && pin.photoUrl ? t("savePin.photoReplaceSuffix") : ""})
          {isEditing && pin.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pin.photoUrl} alt="" className="mt-1 mb-1 h-20 w-full rounded-lg object-cover" />
          )}
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
            {saving ? t("savePin.saving") : t("savePin.save")}
          </button>
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-sm opacity-60">
            {t("savePin.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
