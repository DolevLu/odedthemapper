import type { CSSProperties, ReactNode } from "react";
import type { ThemeConfig } from "@/lib/theme/types";

const RADIUS_BY_SHAPE: Record<ThemeConfig["shape"], string> = {
  rounded: "1.25rem",
  organic: "1rem",
  sharp: "0.5rem",
};

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
  const style: CSSProperties & Record<string, string> = {
    "--primary": theme.palette.primary,
    "--secondary": theme.palette.secondary,
    "--accent": theme.palette.accent,
    "--background": theme.palette.background,
    "--surface": theme.palette.surface,
    "--text": theme.palette.text,
    "--radius": RADIUS_BY_SHAPE[theme.shape],
  };

  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  );
}
