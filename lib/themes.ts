/** The looks a visitor can switch between. Every theme shares one page layout; the tokens each one
 * changes live in app/globals.css under html[data-theme="<id>"]. */
export type ThemeId = "lantern" | "paper" | "evergreen" | "midnight" | "ruby";

export const DEFAULT_THEME: ThemeId = "lantern";
export const THEME_STORAGE_KEY = "tls-theme";

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  blurb: string;
  /** Preview colours for the picker: page background, brand, highlight, text. */
  swatch: { bg: string; brand: string; highlight: string; ink: string };
  /** The word this theme uses for recommending a provider. */
  recommendWord: string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: "lantern",
    name: "Lantern",
    blurb: "Bright and bold, with a scene for every trade",
    swatch: { bg: "#FFFFFF", brand: "#D9480F", highlight: "#FFD45C", ink: "#17171C" },
    recommendWord: "Vouch",
  },
  {
    id: "paper",
    name: "Paper",
    blurb: "A warm neighbourhood guide in print",
    swatch: { bg: "#F4EFE4", brand: "#B8472A", highlight: "#D9A441", ink: "#18241E" },
    recommendWord: "Vouch",
  },
  {
    id: "evergreen",
    name: "Evergreen",
    blurb: "Clean, calm and green",
    swatch: { bg: "#FFFFFF", brand: "#0E5A4A", highlight: "#E2553B", ink: "#13231C" },
    recommendWord: "Recommend",
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "Dark, with a lime glow",
    swatch: { bg: "#10231C", brand: "#C8F169", highlight: "#1A3329", ink: "#F1F6F2" },
    recommendWord: "Vouch",
  },
  {
    id: "ruby",
    name: "Ruby",
    blurb: "Crisp red and green, straight to the point",
    swatch: { bg: "#FFFFFF", brand: "#D4142A", highlight: "#128A3A", ink: "#222222" },
    recommendWord: "Rate",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

/** Runs in <head> before first paint so a saved theme never flashes the default one. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(
  THEMES.map((t) => t.id)
)}.indexOf(t)>-1)document.documentElement.dataset.theme=t}catch(e){}})()`;
