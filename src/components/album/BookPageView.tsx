import type { BookPage, BookLook, FrameStyle } from "@/lib/albumBook";
import { LOOK_STYLES } from "@/lib/albumBook";

/** One page of the album book. Sized entirely with container-query units
 * (cqw), so the exact same markup renders as a full-size page in the viewer
 * and as a tiny thumbnail in the editor's page strip. */

function Frame({ frame, url, index, selected, onClick, alt }: { frame: FrameStyle; url: string; index: number; selected?: boolean; onClick?: () => void; alt: string }) {
  const empty = !url;
  const img = empty ? (
    <div className="flex h-full w-full items-center justify-center bg-black/5 text-[6cqw] opacity-50">＋</div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" draggable={false} />
  );
  const ring = selected ? "0 0 0 0.9cqw #7C3AED" : undefined;
  const rot = ((index * 37) % 7) - 3; // -3..3deg, stable per slot
  const common = { cursor: onClick ? "pointer" : undefined } as const;

  if (frame === "polaroid") {
    return (
      <div className="h-full w-full p-[1.2cqw]" onClick={onClick} style={common}>
        <div className="h-full w-full bg-white p-[1.4cqw] pb-[4.5cqw] shadow-lg" style={{ transform: `rotate(${rot}deg)`, boxShadow: ring ?? "0 1.2cqw 3cqw rgba(0,0,0,.28)" }}>
          <div className="h-full w-full overflow-hidden">{img}</div>
        </div>
      </div>
    );
  }
  if (frame === "tape") {
    return (
      <div className="relative h-full w-full p-[1.6cqw]" onClick={onClick} style={common}>
        <div className="h-full w-full overflow-hidden bg-white p-[.9cqw] shadow-md" style={{ transform: `rotate(${rot}deg)`, boxShadow: ring ?? "0 .8cqw 2cqw rgba(0,0,0,.22)" }}>
          <div className="h-full w-full overflow-hidden">{img}</div>
        </div>
        <span className="absolute -top-[.4cqw] start-[4cqw] h-[3cqw] w-[9cqw] rotate-[-8deg] bg-yellow-200/80" />
        <span className="absolute -top-[.4cqw] end-[4cqw] h-[3cqw] w-[9cqw] rotate-[7deg] bg-yellow-200/80" />
      </div>
    );
  }
  if (frame === "film") {
    return (
      <div className="h-full w-full p-[.8cqw]" onClick={onClick} style={common}>
        <div className="relative h-full w-full bg-neutral-900 px-[3.4cqw] py-[1.2cqw]" style={{ boxShadow: ring }}>
          <span className="absolute inset-y-0 start-[.9cqw] w-[1.3cqw]" style={{ background: "repeating-linear-gradient(to bottom,#e5e5e5 0 1.2cqw,transparent 1.2cqw 2.8cqw)" }} />
          <span className="absolute inset-y-0 end-[.9cqw] w-[1.3cqw]" style={{ background: "repeating-linear-gradient(to bottom,#e5e5e5 0 1.2cqw,transparent 1.2cqw 2.8cqw)" }} />
          <div className="h-full w-full overflow-hidden">{img}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full w-full p-[.8cqw]" onClick={onClick} style={common}>
      <div className="h-full w-full overflow-hidden rounded-[1.6cqw]" style={{ boxShadow: ring }}>
        {img}
      </div>
    </div>
  );
}

export function BookPageView({
  page,
  look,
  editable = false,
  selectedSlot = null,
  onSlotClick,
}: {
  page: BookPage;
  look: BookLook;
  editable?: boolean;
  selectedSlot?: number | null;
  onSlotClick?: (slot: number) => void;
}) {
  const s = LOOK_STYLES[look];
  const slot = (i: number) => (
    <Frame
      key={i}
      frame={page.frame}
      url={page.photos[i] ?? ""}
      index={i}
      selected={editable && selectedSlot === i}
      onClick={editable ? () => onSlotClick?.(i) : undefined}
      alt={page.title || page.caption}
    />
  );
  const title = page.title ? (
    <h3 className="font-extrabold leading-tight" style={{ fontSize: "5.4cqw", color: s.ink }}>
      {page.title}
    </h3>
  ) : null;
  const caption = page.caption ? (
    <p className="leading-snug" style={{ fontSize: "3.3cqw", color: s.ink, opacity: 0.75 }}>
      {page.caption}
    </p>
  ) : null;

  let body: React.ReactNode;
  if (page.layout === "cover") {
    const bg = page.photos[0];
    body = (
      <div className="relative h-full w-full overflow-hidden" style={{ background: s.cover }} onClick={editable ? () => onSlotClick?.(0) : undefined}>
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,.08) 30%,rgba(0,0,0,.68))" }} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[1.4cqw] p-[7cqw]" style={{ color: "#fff" }}>
          <span className="font-semibold uppercase tracking-[.4cqw]" style={{ fontSize: "2.6cqw", opacity: 0.85 }}>
            טראבי
          </span>
          <h2 className="font-extrabold leading-[1.05]" style={{ fontSize: "10cqw" }}>
            {page.title}
          </h2>
          {page.caption && <p style={{ fontSize: "3.6cqw", opacity: 0.9 }}>{page.caption}</p>}
        </div>
        {editable && selectedSlot === 0 && <div className="pointer-events-none absolute inset-[1cqw] rounded-[1cqw]" style={{ boxShadow: "inset 0 0 0 .9cqw #7C3AED" }} />}
      </div>
    );
  } else if (page.layout === "quote") {
    body = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-[3cqw] p-[10cqw] text-center">
        <span style={{ fontSize: "16cqw", color: s.accent, lineHeight: 0.6 }}>“</span>
        <p className="font-bold leading-snug" style={{ fontSize: "7cqw", color: s.ink }}>
          {page.title || "…"}
        </p>
        {caption}
      </div>
    );
  } else {
    const grid =
      page.layout === "full" ? (
        <div className="h-full min-h-0 w-full">{slot(0)}</div>
      ) : page.layout === "duo" ? (
        <div className="grid h-full min-h-0 grid-rows-2 gap-[1.5cqw]">
          {slot(0)}
          {slot(1)}
        </div>
      ) : page.layout === "trio" ? (
        <div className="grid h-full min-h-0 grid-cols-2 grid-rows-[1.35fr_1fr] gap-[1.5cqw]">
          <div className="col-span-2 min-h-0">{slot(0)}</div>
          <div className="min-h-0">{slot(1)}</div>
          <div className="min-h-0">{slot(2)}</div>
        </div>
      ) : page.layout === "quad" ? (
        <div className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-[1.5cqw]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="min-h-0">
              {slot(i)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid h-full min-h-0 grid-cols-6 grid-rows-4 gap-[1.2cqw]">
          <div className="col-span-4 row-span-2 min-h-0">{slot(0)}</div>
          <div className="col-span-2 min-h-0">{slot(1)}</div>
          <div className="col-span-2 min-h-0">{slot(2)}</div>
          <div className="col-span-2 row-span-2 min-h-0">{slot(3)}</div>
          <div className="col-span-2 row-span-2 min-h-0">{slot(4)}</div>
          <div className="col-span-2 row-span-2 min-h-0">{slot(5)}</div>
        </div>
      );
    body = (
      <div className="flex h-full w-full flex-col gap-[2cqw] p-[5cqw]">
        {(title || caption) && (
          <header className="flex shrink-0 flex-col gap-[.6cqw]">
            {title}
            {caption}
          </header>
        )}
        <div className="min-h-0 flex-1">{grid}</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full [container-type:inline-size]" style={{ background: s.paper }}>
      {body}
    </div>
  );
}
