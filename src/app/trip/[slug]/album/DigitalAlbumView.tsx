import type { ThemeConfig } from "@/lib/theme/types";
import type { AlbumMediaItem, CuratedPhoto } from "./AlbumScreen";

const ROTATIONS = [-4, 3, -2, 5, -3, 2, 4, -5, 1, -1];

function radiusForShape(shape: ThemeConfig["shape"]): string {
  if (shape === "sharp") return "4px";
  if (shape === "organic") return "38% 62% 63% 37% / 41% 44% 56% 59%";
  return "20px";
}

export function DigitalAlbumView({
  destinationName,
  theme,
  media,
  curatedPhotos,
}: {
  destinationName: string;
  theme: ThemeConfig;
  media: AlbumMediaItem[];
  curatedPhotos: CuratedPhoto[];
}) {
  const items = [
    ...media.map((m) => ({ id: m.id, url: m.url, type: m.type, caption: undefined as string | undefined })),
    ...curatedPhotos.map((p) => ({ id: p.id, url: p.url, type: "photo" as const, caption: p.caption })),
  ];
  const frameRadius = radiusForShape(theme.shape);

  return (
    <div
      className="overflow-hidden border p-8"
      style={{
        borderRadius: "var(--radius)",
        borderColor: theme.palette.primary,
        background: `linear-gradient(160deg, ${theme.palette.background}, ${theme.palette.surface})`,
      }}
    >
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.palette.secondary }}>
          עודד המנקד · אלבום דיגיטלי
        </p>
        <h2
          className="mt-2 text-3xl font-extrabold"
          style={{ fontFamily: "var(--font-heading)", color: theme.palette.primary }}
        >
          {destinationName}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-60">{theme.mood}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-sm opacity-50">
          האלבום הדיגיטלי שלכם עדיין ריק — העלו תמונות מהטיול כדי לראות אותו קם לחיים.
        </p>
      ) : (
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
                {item.type === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover" muted controls />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.caption ?? ""} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              {item.caption && (
                <figcaption className="mt-2 text-xs opacity-60" style={{ fontFamily: "var(--font-heading)" }}>
                  {item.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
