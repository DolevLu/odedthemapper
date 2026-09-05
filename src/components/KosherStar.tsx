/** Two overlapping triangles — the simplest correct way to draw a
 * recognizable Star of David (מגן דוד) as a single filled SVG path, used both
 * as the map's kosher-only filter toggle and as the small badge on a kosher
 * restaurant's card. Always red, independent of any active/highlight state
 * around it, so it reads the same everywhere. */
const STAR_OF_DAVID_PATH = "M12 3 L20 18 L4 18 Z M12 21 L4 6 L20 6 Z";

export function KosherStar({ size = 14, color = "#DC2626" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_OF_DAVID_PATH} fill={color} />
    </svg>
  );
}

export const KOSHER_TAG_MATCH = /כשר|kosher/i;
