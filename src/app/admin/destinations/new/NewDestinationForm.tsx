"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDestination } from "@/lib/actions/admin";
import type { StarterTheme } from "@/lib/theme/starterThemes";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

const CONTINENTS = [
  { value: "europe", label: "אירופה" },
  { value: "asia", label: "אסיה" },
  { value: "africa", label: "אפריקה" },
  { value: "americas", label: "אמריקה" },
  { value: "oceania", label: "אוקיאניה" },
  { value: "middle-east", label: "המזרח התיכון" },
];

export function NewDestinationForm({ starterThemes }: { starterThemes: StarterTheme[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedThemeKey, setSelectedThemeKey] = useState(starterThemes[0].key);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const selectedTheme = starterThemes.find((t) => t.key === selectedThemeKey) ?? starterThemes[0];

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("slug", effectiveSlug);
    formData.set("themeConfig", JSON.stringify(selectedTheme.theme));
    startTransition(async () => {
      try {
        const result = await createDestination(formData);
        if ("error" in result) setError(result.error);
        else router.push(`/admin/destinations/${result.slug}`);
      } catch {
        setError("שגיאה לא צפויה - נסו שוב");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold" htmlFor="name">
          שם היעד
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="למשל: תאילנד"
          className="rounded-lg border px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold" htmlFor="slug">
          כתובת (slug)
        </label>
        <input
          id="slug"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          placeholder="thailand"
          dir="ltr"
          className="rounded-lg border px-3 py-2 text-end font-mono text-sm"
        />
        <p className="text-xs opacity-50">ישמש בכתובת: /trip/{effectiveSlug || "..."}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold" htmlFor="tagline">
          תגית שיווקית (אופציונלי)
        </label>
        <input id="tagline" name="tagline" placeholder="למשל: איים טרופיים וחופים קסומים" className="rounded-lg border px-3 py-2" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold" htmlFor="continent">
          יבשת
        </label>
        <select id="continent" name="continent" defaultValue="europe" className="rounded-lg border px-3 py-2">
          {CONTINENTS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isBestSeller" />
        סימון כ-BEST SELLER
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">עיצוב פתיחה (אפשר לשנות בהמשך ישירות ב-DB)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {starterThemes.map((t) => {
            const active = t.key === selectedThemeKey;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedThemeKey(t.key)}
                className="flex flex-col gap-2 rounded-xl border p-3 text-start"
                style={{ borderColor: active ? t.theme.palette.primary : "rgba(0,0,0,0.1)", borderWidth: active ? 2 : 1 }}
              >
                <div className="flex gap-1">
                  <span className="h-5 w-5 rounded-full" style={{ background: t.theme.palette.primary }} />
                  <span className="h-5 w-5 rounded-full" style={{ background: t.theme.palette.secondary }} />
                  <span className="h-5 w-5 rounded-full" style={{ background: t.theme.palette.accent }} />
                </div>
                <span className="text-xs font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending || !name}
        className="rounded-lg bg-black px-4 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "יוצר..." : "יצירת יעד"}
      </button>
      <p className="text-xs opacity-50">
        היעד ייווצר במצב &quot;draft&quot; (לא גלוי ללקוחות) - לאחר היצירה תעברו למסך הניהול שלו כדי להעלות KML ולפרסם אותו.
      </p>
    </form>
  );
}
