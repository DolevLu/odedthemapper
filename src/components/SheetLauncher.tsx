"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useBackToClose } from "@/hooks/useBackToClose";

/** A button that opens its children in a bottom sheet (phone) / centred dialog (wide screens) — keeps forms and tools
 * out of the page until they're wanted. The content stays mounted while closed so a form's server action isn't
 * interrupted; submitting any form inside closes the sheet. */
export function SheetLauncher({
  label,
  title,
  children,
  variant = "primary",
  className = "",
}: {
  label: ReactNode;
  title: string;
  children: ReactNode;
  variant?: "primary" | "soft" | "onDark" | "white";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  useBackToClose(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const styles =
    variant === "primary"
      ? { background: "var(--primary)", color: "white" }
      : variant === "white"
        ? { background: "white", color: "var(--primary)" }
        : variant === "onDark"
        ? { background: "rgba(255,255,255,0.18)", color: "white" }
        : { background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold ${className}`} style={styles}>
        {label}
      </button>
      <div hidden={!open} className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
        <div
          className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-w-lg sm:rounded-3xl"
          style={{ background: "color-mix(in srgb, var(--primary) 8%, #ffffff)", color: "#1F2937", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex shrink-0 items-center justify-between px-5 pb-3.5 pt-4 text-white" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))" }}>
            <h2 className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="✕" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-base">
              ✕
            </button>
          </div>
          <div className="sheet-content overflow-y-auto px-5 pb-6 pt-4" onSubmit={() => setTimeout(() => setOpen(false), 0)}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
