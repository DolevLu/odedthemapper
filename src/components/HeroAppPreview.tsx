import Image from "next/image";

// A real drone photo of Prague (Charles Bridge + castle skyline) stands in
// for whichever destination's actual map the viewer will see — reads
// unmistakably as "a real city" at a glance, unlike an abstract map
// illustration. Self-hosted (public/hero-prague.jpg, resized/compressed from
// the Wikimedia Commons original) rather than hotlinked — Wikimedia's upload
// servers reject Next.js's own image-optimizer requests with a 400 (their
// upload host is picky about the request's User-Agent, which the optimizer
// doesn't let you customize per-image). CC BY 4.0, European Commission
// Audiovisual Service — see the attribution line on the card, required by
// the license.
const HERO_PHOTO_URL = "/hero-prague.jpg";
const HERO_PHOTO_SOURCE_URL = "https://commons.wikimedia.org/wiki/File:Ponte_Carlo,_Praga_(9).jpg";

// A static, illustrative preview of the actual product — real brand colors
// and category palette (see lib/mapStyles.ts) over a real city photo —
// sitting beside the homepage hero copy so "what this actually does" reads
// at a glance instead of needing the paragraph above it.
export function HeroAppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0" aria-hidden="true">
      <div
        className="relative overflow-hidden rounded-[28px] border shadow-xl"
        style={{ borderColor: "rgba(124,58,237,0.15)", background: "#eef2ed" }}
      >
        {/* mini map — a real aerial photo of a city (Prague), so it
         * unmistakably reads as "a real place" at a glance rather than an
         * abstract map illustration or planning canvas. */}
        <div className="relative h-56 w-full overflow-hidden">
          <Image
            src={HERO_PHOTO_URL}
            alt=""
            fill
            sizes="384px"
            className="object-cover"
            style={{ objectPosition: "center 35%" }}
            priority
          />
          {/* Gentle bottom-up darkening so the pins/popup/chat bubble stay
           * legible over the photo regardless of what's directly behind them. */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.25) 100%)" }} />

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

          {/* Required CC BY 4.0 attribution for the photo above — small and
           * unobtrusive (matches how map basemap credits are usually shown)
           * but genuinely visible, not hidden. */}
          <a
            href={HERO_PHOTO_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-1 end-1.5 text-[8px] text-white/70 hover:text-white/90"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
          >
            📷 European Commission · CC BY 4.0
          </a>
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
