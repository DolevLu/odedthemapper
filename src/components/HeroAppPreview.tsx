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
        {/* mini map — a top-down cityscape (street grid + building
         * footprints + a river/bridge), so it unmistakably reads as "a city
         * on a map" at a glance rather than an abstract planning canvas. */}
        <div className="relative h-56 w-full overflow-hidden">
          <svg viewBox="0 0 400 224" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0" y="0" width="400" height="224" fill="#eef1ea" />

            {/* park */}
            <rect x="18" y="16" width="82" height="58" rx="10" fill="#d3e6cf" />

            {/* river + bridge, a nod to the actual itinerary strip below */}
            <path d="M -20 210 Q 140 150 220 190 T 420 130" stroke="#c3d8e6" strokeWidth="26" fill="none" />
            <line x1="255" y1="150" x2="285" y2="205" stroke="#eef1ea" strokeWidth="8" />

            {/* street grid */}
            <g stroke="#d7d3c6" strokeWidth="7">
              <line x1="0" y1="86" x2="400" y2="86" />
              <line x1="0" y1="150" x2="400" y2="150" />
              <line x1="118" y1="0" x2="118" y2="224" />
              <line x1="232" y1="0" x2="232" y2="224" />
              <line x1="330" y1="0" x2="330" y2="224" />
            </g>

            {/* building footprints — varied sizes/shades per city block so it
             * reads as real structures, not a texture */}
            <g>
              <rect x="130" y="10" width="42" height="30" rx="2" fill="#d9d4c8" />
              <rect x="180" y="14" width="34" height="24" rx="2" fill="#cfc9bb" />
              <rect x="244" y="8" width="50" height="34" rx="2" fill="#e0dbcf" />
              <rect x="304" y="14" width="20" height="26" rx="2" fill="#d2ccbe" />
              <rect x="340" y="10" width="46" height="32" rx="2" fill="#d9d4c8" />

              <rect x="10" y="96" width="36" height="42" rx="2" fill="#dcd7cb" />
              <rect x="54" y="100" width="30" height="30" rx="2" fill="#cfc9bb" />
              <rect x="130" y="94" width="44" height="46" rx="2" fill="#e0dbcf" />
              <rect x="184" y="100" width="26" height="34" rx="2" fill="#d2ccbe" />
              <rect x="240" y="96" width="38" height="44" rx="2" fill="#d9d4c8" />
              <rect x="340" y="98" width="48" height="40" rx="2" fill="#dcd7cb" />

              <rect x="8" y="162" width="40" height="30" rx="2" fill="#d2ccbe" />
              <rect x="56" y="158" width="50" height="36" rx="2" fill="#e0dbcf" />
              <rect x="130" y="164" width="30" height="28" rx="2" fill="#cfc9bb" />
              <rect x="244" y="160" width="36" height="34" rx="2" fill="#dcd7cb" />
              <rect x="290" y="166" width="28" height="26" rx="2" fill="#d9d4c8" />
              <rect x="336" y="160" width="44" height="34" rx="2" fill="#d2ccbe" />
            </g>
          </svg>

          {[
            { top: "24%", right: "62%", color: "#7C3AED" },
            { top: "58%", right: "38%", color: "#F97316" },
            { top: "34%", right: "18%", color: "#1E3A5F" },
            { top: "74%", right: "55%", color: "#16A34A" },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ top: p.top, right: p.right, background: p.color }}
            />
          ))}

          {/* open popup — anchored above the purple pin, with a pointer tail,
           * so it's obvious pins are clickable and show real info */}
          <div className="absolute z-10 w-32 -translate-x-1/2" style={{ top: "0%", right: "62%" }}>
            <div className="overflow-hidden rounded-lg bg-white shadow-lg">
              <div className="h-10 w-full" style={{ background: "linear-gradient(135deg, #F97316, #EC4899)" }} />
              <div className="p-1.5 text-right">
                <p className="truncate text-[10px] font-bold">Café Savoy</p>
                <p className="truncate text-[9px] opacity-60">בית קפה · 350 מ׳</p>
              </div>
            </div>
            <div
              className="mx-auto h-2 w-2 -translate-y-1 rotate-45 bg-white"
              style={{ boxShadow: "1px 1px 1px rgba(0,0,0,0.05)" }}
            />
          </div>

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
