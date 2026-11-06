import type { CSSProperties, ReactNode } from "react";
import type { ThemeConfig } from "@/lib/theme/types";

const RADIUS_BY_SHAPE: Record<ThemeConfig["shape"], string> = {
  rounded: "1.25rem",
  organic: "1rem",
  sharp: "0.5rem",
};

const BRAND = { primary: "#6D28D9", secondary: "#DDD6FE", accent: "#7C3AED", background: "#FFFFFF", surface: "#FFFFFF", text: "#111111" };

/** Renders theme CSS variables as inline style — every shared component under
 * this element (map, POI cards, nav, buttons) picks up the destination's
 * color palette/shape automatically via the tokens defined in globals.css.
 * Typography is intentionally NOT themed here — one font is used site-wide. */
export function DestinationThemeProvider({
  theme,
  children,
  as: Tag = "div",
  className,
}: {
  theme: ThemeConfig;
  children: ReactNode;
  as?: "div" | "main";
  className?: string;
}) {
  // 2026-11 brand rule: the WHOLE app is white background, black text and one brand purple - no per-destination
  // palettes anymore (only the corner shape still varies). The destination's own palette is intentionally ignored.
  void theme.palette;
  const style: CSSProperties & Record<string, string> = {
    "--primary": BRAND.primary,
    "--secondary": BRAND.secondary,
    "--accent": BRAND.accent,
    "--background": BRAND.background,
    "--surface": BRAND.surface,
    "--text": BRAND.text,
    "--radius": RADIUS_BY_SHAPE[theme.shape],
  };

  return (
    // destination-theme-root: targeted by globals.css's dark-mode override
    // (see the :root[data-theme="dark"] rule) — that's the only thing that
    // can beat this element's own inline --background/--surface/--text.
    <Tag className={className ? `destination-theme-root ${className}` : "destination-theme-root"} style={style}>
      {children}
    </Tag>
  );
}
