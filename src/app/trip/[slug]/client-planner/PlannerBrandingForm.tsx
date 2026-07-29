"use client";

import { useState } from "react";
import { savePlannerProfile } from "@/lib/actions/trip";

export function PlannerBrandingForm({
  slug,
  companyName,
  logoUrl,
}: {
  slug: string;
  companyName: string | null;
  logoUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const action = savePlannerProfile.bind(null, slug);

  return (
    <div className="border p-4" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2">
          🏷️ מיתוג המשרד שלכם על מסלולים ללקוח
          {companyName && <span className="text-xs font-normal opacity-60">({companyName})</span>}
        </span>
        <span className="opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-12 w-12 rounded-lg border object-contain" style={{ borderColor: "var(--primary)" }} />
          )}
          <label className="text-xs opacity-60">
            שם המשרד / העסק
            <input
              name="companyName"
              defaultValue={companyName ?? ""}
              placeholder="למשל: טיולי הכוכב"
              className="mt-1 block w-56 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--primary)" }}
            />
          </label>
          <label className="text-xs opacity-60">
            לוגו
            <input name="logo" type="file" accept="image/*" className="mt-1 block text-sm" />
          </label>
          <button type="submit" className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
            שמירה
          </button>
          <p className="w-full text-xs opacity-50">המיתוג יוצג לצד המיתוג של עודד המנקד במסלול המשותף ללקוח.</p>
        </form>
      )}
    </div>
  );
}
