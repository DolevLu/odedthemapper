export type ThemeConfig = {
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  shape: "rounded" | "sharp" | "organic";
  mood: string; // short art-direction note for future hero art / illustration briefs
};
