// A static, illustrative preview of the actual product — real brand colors
// and category palette (see lib/mapStyles.ts), not a screenshot — sitting
// beside the homepage hero copy so "what this actually does" reads at a
// glance instead of needing the paragraph above it.
export function HeroAppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0" aria-hidden="true">
      <div
        className="relative overflow-hidden rounded-[28px] border shadow-xl"
        style={{ borderColor: "rgba(124,58,237,0.15)", background: "#eef2ed" }}
      >
        {/* mini map */}
        <div className="relative h-52 w-full overflow-hidden">
          <div className="absolute inset-0" style={{ background: "#e9efe4" }}>
            <div className="absolute left-0 top-0 h-32 w-40" style={{ background: "#dbe8d8" }} />
            <div className="absolute bottom-0 right-0 h-28 w-48" style={{ background: "#e2ecdf" }} />
          </div>
          {[
            { top: "22%", right: "62%", color: "#7C3AED" },
            { top: "45%", right: "38%", color: "#F97316" },
            { top: "30%", right: "20%", color: "#1E3A5F" },
            { top: "68%", right: "55%", color: "#16A34A" },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ top: p.top, right: p.right, background: p.color }}
            />
          ))}
          <span
            className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full text-base shadow-md"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
          >
            💬
          </span>
        </div>

        {/* mini itinerary strip */}
        <div className="flex flex-col gap-2 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-60">📅 היום במסלול שלכם</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#16A34A" }}>
              עכשיו
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border p-2" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
            <span className="text-xs font-bold" style={{ color: "#7C3AED" }}>
              10:30
            </span>
            <span className="truncate text-xs font-semibold">טיילת גשר קרלוס</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border p-2 opacity-60" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
            <span className="text-xs font-bold" style={{ color: "#7C3AED" }}>
              13:00
            </span>
            <span className="truncate text-xs font-semibold">ארוחת צהריים · Café Savoy</span>
          </div>
        </div>
      </div>

      {/* floating countdown chip */}
      <div
        className="absolute -top-4 -start-4 flex items-center gap-1.5 rounded-full border bg-white px-3 py-2 text-xs font-bold shadow-lg"
        style={{ borderColor: "rgba(124,58,237,0.15)" }}
      >
        <span>🧭</span>
        <span>עוד 12 ימים לטיול</span>
      </div>
    </div>
  );
}
