import type { ReactNode } from "react";

/** A horizontally swipeable row of larger cards: bigger to read than a stacked grid, yet it only takes one row of
 * screen height. On wide screens it becomes a normal wrapping grid. */
export function InfoStrip({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h2>
      {hint ? <p className="mb-2 text-xs opacity-60">{hint}</p> : <div className="mb-2" />}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

export function InfoCard({ label, title, body, footer, accent }: { label?: string; title?: string; body?: string; footer?: ReactNode; accent?: string }) {
  return (
    <div
      className="flex w-[78%] shrink-0 snap-start flex-col gap-1.5 border p-3.5 sm:w-auto"
      style={{ borderRadius: "var(--radius)", borderColor: accent ?? "var(--primary)", background: "var(--surface)" }}
    >
      {label && <p className="text-xs font-semibold opacity-60">{label}</p>}
      {title && <h3 className="text-base font-bold leading-snug">{title}</h3>}
      {body && <p className="text-sm leading-relaxed opacity-80">{body}</p>}
      {footer && <div className="mt-auto pt-1 text-sm">{footer}</div>}
    </div>
  );
}
