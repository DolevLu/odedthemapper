import type { ThemeConfig } from "@/lib/theme/types";
import type { AlbumMediaItem, CuratedPhoto } from "./AlbumScreen";
import type { AlbumDaysConfig } from "@/lib/actions/album";

const ROTATIONS = [-4, 3, -2, 5, -3, 2, 4, -5, 1, -1];

function radiusForShape(shape: ThemeConfig["shape"]): string {
  if (shape === "sharp") return "4px";
  if (shape === "organic") return "38% 62% 63% 37% / 41% 44% 56% 59%";
  return "20px";
}

type Item = { id: string; url: string; type: "photo" | "video"; caption?: string };

function MediaFrame({ item, radius, surface }: { item: Item; radius: string; surface: string }) {
  return item.type === "video" ? (
    <video src={item.url} className="h-full w-full object-cover" muted controls style={{ borderRadius: radius, background: surface }} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt={item.caption ?? ""} className="h-full w-full object-cover" loading="lazy" style={{ borderRadius: radius }} />
  );
}

function PolaroidGrid({ items, theme, frameRadius }: { items: Item[]; theme: ThemeConfig; frameRadius: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
      {items.map((item, i) => (
        <figure
          key={item.id}
          className="flex flex-col items-center transition-transform hover:z-10 hover:!rotate-0"
          style={{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)` }}
        >
          <div
            className="aspect-[4/5] w-full overflow-hidden border-4 shadow-lg"
            style={{ borderRadius: frameRadius, borderColor: theme.palette.surface, background: theme.palette.surface }}
          >
            <MediaFrame item={item} radius="0" surface={theme.palette.surface} />
          </div>
          {item.caption && (
            <figcaption className="mt-2 text-xs opacity-60" style={{ fontFamily: "var(--font-heading)" }}>
              {item.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function PostcardGrid({ items, theme }: { items: Item[]; theme: ThemeConfig }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <figure
          key={item.id}
          className="relative overflow-hidden border-2 border-dashed shadow-md"
          style={{ borderRadius: "6px", borderColor: theme.palette.secondary, background: theme.palette.surface, padding: 6 }}
        >
          <div className="aspect-[3/2] overflow-hidden" style={{ borderRadius: "3px" }}>
            <MediaFrame item={item} radius="0" surface={theme.palette.surface} />
          </div>
          <div
            className="absolute -top-1 -end-1 h-6 w-6"
            style={{ background: `linear-gradient(135deg, transparent 50%, ${theme.palette.background} 50%)` }}
          />
          {item.caption && (
            <figcaption className="mt-1.5 truncate px-1 text-[11px] opacity-60" style={{ fontFamily: "var(--font-heading)" }}>
              ✈️ {item.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function TimelineRow({ items, theme, frameRadius }: { items: Item[]; theme: ThemeConfig; frameRadius: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {items.map((item) => (
        <figure key={item.id} className="w-40 shrink-0">
          <div
            className="aspect-square overflow-hidden border-2 shadow-md"
            style={{ borderRadius: frameRadius, borderColor: theme.palette.surface, background: theme.palette.surface }}
          >
            <MediaFrame item={item} radius="0" surface={theme.palette.surface} />
          </div>
          {item.caption && (
            <figcaption className="mt-1 truncate text-[11px] opacity-60" style={{ fontFamily: "var(--font-heading)" }}>
              {item.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

export function DigitalAlbumView({
  destinationName,
  theme,
  media,
  curatedPhotos,
  settings,
}: {
  destinationName: string;
  theme: ThemeConfig;
  media: AlbumMediaItem[];
  curatedPhotos: CuratedPhoto[];
  settings: { templateKey: string; backgroundColor: string | null; days: AlbumDaysConfig };
}) {
  const userItems: Item[] = media.map((m) => ({ id: m.id, url: m.url, type: m.type, caption: undefined }));
  const inspirationItems: Item[] = curatedPhotos.map((p) => ({ id: p.id, url: p.url, type: "photo", caption: p.caption }));
  const frameRadius = radiusForShape(theme.shape);
  const background = settings.backgroundColor
    ? settings.backgroundColor
    : `linear-gradient(160deg, ${theme.palette.background}, ${theme.palette.surface})`;

  const byDay = new Map<number, AlbumMediaItem[]>();
  const unassigned: AlbumMediaItem[] = [];
  for (const m of media) {
    if (m.dayIndex != null) {
      const list = byDay.get(m.dayIndex) ?? [];
      list.push(m);
      byDay.set(m.dayIndex, list);
    } else {
      unassigned.push(m);
    }
  }
  const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b);
  const hasDayGrouping = sortedDays.length > 0;

  function renderGroup(items: Item[]) {
    if (settings.templateKey === "postcard") return <PostcardGrid items={items} theme={theme} />;
    if (settings.templateKey === "timeline") return <TimelineRow items={items} theme={theme} frameRadius={frameRadius} />;
    return <PolaroidGrid items={items} theme={theme} frameRadius={frameRadius} />;
  }

  return (
    <div className="overflow-hidden border p-8" style={{ borderRadius: "var(--radius)", borderColor: theme.palette.primary, background }}>
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.palette.secondary }}>
          עודד המנקד · אלבום דיגיטלי
        </p>
        <h2 className="mt-2 text-3xl font-extrabold" style={{ fontFamily: "var(--font-heading)", color: theme.palette.primary }}>
          {destinationName}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-60">{theme.mood}</p>
      </div>

      {userItems.length === 0 ? (
        <p className="text-center text-sm opacity-50">
          האלבום הדיגיטלי שלכם עדיין ריק - העלו תמונות מהטיול כדי לראות אותו קם לחיים.
        </p>
      ) : hasDayGrouping ? (
        <div className="flex flex-col gap-10">
          {sortedDays.map((day) => {
            const dayConfig = settings.days[day];
            const items: Item[] = byDay.get(day)!.map((m) => ({ id: m.id, url: m.url, type: m.type, caption: undefined }));
            return (
              <section key={day}>
                <div className="mb-4 flex items-baseline gap-2 border-b pb-2" style={{ borderColor: theme.palette.secondary }}>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: theme.palette.primary }}
                  >
                    {day}
                  </span>
                  <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: theme.palette.primary }}>
                    {dayConfig?.title || `יום ${day}`}
                  </h3>
                  {dayConfig?.subtitle && <span className="text-sm opacity-60">— {dayConfig.subtitle}</span>}
                </div>
                {renderGroup(items)}
              </section>
            );
          })}
          {unassigned.length > 0 && (
            <section>
              <h3 className="mb-4 border-b pb-2 text-lg font-bold" style={{ borderColor: theme.palette.secondary, fontFamily: "var(--font-heading)", color: theme.palette.primary }}>
                עוד רגעים מהטיול
              </h3>
              {renderGroup(unassigned.map((m) => ({ id: m.id, url: m.url, type: m.type, caption: undefined })))}
            </section>
          )}
        </div>
      ) : (
        renderGroup(userItems)
      )}

      {inspirationItems.length > 0 && (
        <div className="mt-10 border-t pt-6" style={{ borderColor: theme.palette.secondary }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest opacity-60">קצת השראה מהיעד</p>
          {renderGroup(inspirationItems)}
        </div>
      )}
    </div>
  );
}
