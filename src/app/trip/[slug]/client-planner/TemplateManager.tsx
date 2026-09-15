"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveItineraryAsTemplate, applyItineraryTemplate, deleteItineraryTemplate } from "@/lib/actions/trip";
import { useTranslation } from "@/components/i18n/LanguageContext";

export function TemplateManager({
  destinationId,
  slug,
  templates,
  hasItinerary,
}: {
  destinationId: string;
  slug: string;
  templates: { id: string; name: string }[];
  hasItinerary: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  function saveAsTemplate() {
    if (!name.trim()) {
      setError(t("clientPlanner.giveTemplateName"));
      return;
    }
    setError(null);
    setSaving(true);
    startTransition(async () => {
      const res = await saveItineraryAsTemplate(destinationId, slug, name.trim());
      setSaving(false);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function apply(templateId: string) {
    startTransition(async () => {
      await applyItineraryTemplate(templateId, destinationId, slug);
      router.refresh();
    });
  }

  function remove(templateId: string) {
    startTransition(async () => {
      await deleteItineraryTemplate(templateId, slug);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 border p-4" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
      <p className="text-sm font-bold">{t("clientPlanner.templatesTitle")}</p>

      {hasItinerary && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("clientPlanner.templateNamePlaceholder")}
            className="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
          <button
            onClick={saveAsTemplate}
            disabled={pending || saving}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
          >
            {t("clientPlanner.saveAsTemplate")}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {templates.length === 0 ? (
        <p className="text-xs opacity-50">{t("clientPlanner.noTemplatesYet")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <div key={template.id} className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: "var(--primary)" }}>
              <span>{template.name}</span>
              <button onClick={() => apply(template.id)} disabled={pending} className="font-semibold underline">
                {t("clientPlanner.use")}
              </button>
              <button onClick={() => remove(template.id)} disabled={pending} className="opacity-50 hover:opacity-100">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
