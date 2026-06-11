import { create } from "zustand";

export type Mode = "dark" | "light";

export interface ThemeDef {
  key: string;
  name: string;
  mode: Mode;
  bg: string;
  panel: string;
  chrome: string;
  border: string;
  fg: string;
  muted: string;
  faint: string;
  hover: string;
  active: string;
  str: string;
  fn: string;
  num: string;
  com: string;
  type: string;
}

export interface AccentDef {
  key: string;
  name: string;
  dark: string;
  light: string;
}

function dark(
  key: string,
  name: string,
  bg: string,
  panel: string,
  chrome: string,
  border: string,
  fg: string,
  muted: string,
  faint: string,
  hover: string,
  active: string,
): ThemeDef {
  return {
    key, name, mode: "dark", bg, panel, chrome, border, fg, muted, faint, hover, active,
    str: "#9bbf9e", fn: "#8fb3d9", num: "#cdb088", com: "#565c66", type: "#c3a8e4",
  };
}

function light(
  key: string,
  name: string,
  bg: string,
  panel: string,
  chrome: string,
  border: string,
  fg: string,
  muted: string,
  faint: string,
  hover: string,
  active: string,
): ThemeDef {
  return {
    key, name, mode: "light", bg, panel, chrome, border, fg, muted, faint, hover, active,
    str: "#5a7d5e", fn: "#3f6d99", num: "#9a7b3f", com: "#aab0b8", type: "#7c5fb0",
  };
}

export const THEMES: ThemeDef[] = [
  dark("graphite", "Graphite", "#15171b", "#14161a", "#101216", "#23262d", "#c9ced6", "#7e848f", "#4a505a", "rgba(255,255,255,0.045)", "rgba(255,255,255,0.026)"),
  dark("obsidian", "Obsidian", "#0c0d0f", "#0a0b0d", "#08090a", "#1b1d22", "#c4c9d0", "#767b85", "#43484f", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.022)"),
  dark("nocturne", "Nocturne", "#12151c", "#10131a", "#0d1016", "#212630", "#c5ccd6", "#7b828f", "#474e5a", "rgba(255,255,255,0.045)", "rgba(255,255,255,0.026)"),
  light("paper", "Paper", "#fbfbfa", "#f5f5f4", "#f0f0ee", "#e4e4e0", "#2b2e33", "#767b83", "#a8adb4", "rgba(0,0,0,0.035)", "rgba(0,0,0,0.022)"),
  light("mist", "Mist", "#f4f6f8", "#eceff2", "#e7eaed", "#dadee3", "#2a2f36", "#727983", "#a4abb4", "rgba(0,0,0,0.035)", "rgba(0,0,0,0.02)"),
  light("porcelain", "Porcelain", "#ffffff", "#fafafa", "#f6f6f6", "#ebebe9", "#26292e", "#787d85", "#aeb3b9", "rgba(0,0,0,0.03)", "rgba(0,0,0,0.018)"),
];

export const ACCENTS: AccentDef[] = [
  { key: "lavender", name: "Lavender", dark: "#b89ce0", light: "#7c5fb0" },
  { key: "azure", name: "Azure", dark: "#6f9cf0", light: "#3f6d99" },
  { key: "sage", name: "Sage", dark: "#7fcaa5", light: "#4f8f6b" },
  { key: "slate", name: "Slate", dark: "#9aa7b8", light: "#5b6675" },
];

function hexRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

interface ThemeState {
  mode: Mode;
  lastDark: string;
  lastLight: string;
  accentKey: string;
  toggleMode: () => void;
  setMode: (m: Mode) => void;
  setAccent: (key: string) => void;
  pickTheme: (key: string) => void;
}

const STORAGE_KEY = "lume.theme.v1";

interface Persisted {
  mode: Mode;
  lastDark: string;
  lastLight: string;
  accentKey: string;
}

function load(): Persisted {
  const fallback: Persisted = {
    mode: "dark",
    lastDark: "graphite",
    lastLight: "paper",
    accentKey: "lavender",
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      mode: parsed.mode === "light" ? "light" : "dark",
      lastDark: THEMES.some((t) => t.key === parsed.lastDark && t.mode === "dark") ? parsed.lastDark! : fallback.lastDark,
      lastLight: THEMES.some((t) => t.key === parsed.lastLight && t.mode === "light") ? parsed.lastLight! : fallback.lastLight,
      accentKey: ACCENTS.some((a) => a.key === parsed.accentKey) ? parsed.accentKey! : fallback.accentKey,
    };
  } catch {
    return fallback;
  }
}

function persist(s: ThemeState) {
  try {
    const data: Persisted = {
      mode: s.mode,
      lastDark: s.lastDark,
      lastLight: s.lastLight,
      accentKey: s.accentKey,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — theme simply won't persist */
  }
}

export function activeKey(s: { mode: Mode; lastDark: string; lastLight: string }): string {
  return s.mode === "dark" ? s.lastDark : s.lastLight;
}

export function activeTheme(s: { mode: Mode; lastDark: string; lastLight: string }): ThemeDef {
  return THEMES.find((t) => t.key === activeKey(s)) ?? THEMES[0];
}

export function activeAccentColor(s: { mode: Mode; accentKey: string }): string {
  const a = ACCENTS.find((x) => x.key === s.accentKey) ?? ACCENTS[0];
  return s.mode === "dark" ? a.dark : a.light;
}

/** Compute the full set of CSS custom properties for the active theme. */
export function computeVars(s: ThemeState): Record<string, string> {
  const t = activeTheme(s);
  const isDark = s.mode === "dark";
  const accent = activeAccentColor(s);
  return {
    "--bg": t.bg,
    "--panel": t.panel,
    "--chrome": t.chrome,
    "--border": t.border,
    "--fg": t.fg,
    "--muted": t.muted,
    "--faint": t.faint,
    "--hover": t.hover,
    "--active": t.active,
    "--accent": accent,
    "--sel": hexRgba(accent, isDark ? 0.18 : 0.14),
    "--kw": accent,
    "--str": t.str,
    "--fn": t.fn,
    "--num": t.num,
    "--com": t.com,
    "--type": t.type,
    "--prompt": t.fn,
  };
}

export interface XtermTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

/** Build an xterm.js theme from the active lume theme. */
export function xtermTheme(s: { mode: Mode; lastDark: string; lastLight: string; accentKey: string }): XtermTheme {
  const t = activeTheme(s);
  const accent = activeAccentColor(s);
  const dark = s.mode === "dark";
  const ansi = dark
    ? {
        black: "#2a2e35", red: "#c87d7d", green: "#9bbf9e", yellow: "#cdb088",
        blue: "#8fb3d9", magenta: "#c3a8e4", cyan: "#88c0cf", white: "#c9ced6",
        brightBlack: "#4a505a", brightRed: "#d99a9a", brightGreen: "#b0d4b3",
        brightYellow: "#dec79f", brightBlue: "#a8c8e8", brightMagenta: "#d4bef0",
        brightCyan: "#a3d4e0", brightWhite: "#eef1f5",
      }
    : {
        black: "#3a3f47", red: "#a85656", green: "#5a7d5e", yellow: "#9a7b3f",
        blue: "#3f6d99", magenta: "#7c5fb0", cyan: "#3f8896", white: "#5a606a",
        brightBlack: "#a8adb4", brightRed: "#b86a6a", brightGreen: "#6b8f6f",
        brightYellow: "#a98a4f", brightBlue: "#4f7da9", brightMagenta: "#8d70c0",
        brightCyan: "#4f98a6", brightWhite: "#2b2e33",
      };
  return {
    background: t.bg,
    foreground: t.fg,
    cursor: accent,
    cursorAccent: t.bg,
    selectionBackground: hexRgba(accent, dark ? 0.3 : 0.22),
    ...ansi,
  };
}

function applyTheme(s: ThemeState) {
  const vars = computeVars(s);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.colorScheme = s.mode;
}

const initial = load();

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...initial,
  toggleMode: () => set({ mode: get().mode === "dark" ? "light" : "dark" }),
  setMode: (m) => set({ mode: m }),
  setAccent: (key) => set({ accentKey: key }),
  pickTheme: (key) => {
    const def = THEMES.find((t) => t.key === key);
    if (!def) return;
    if (def.mode === "dark") set({ mode: "dark", lastDark: key });
    else set({ mode: "light", lastLight: key });
  },
}));

// Apply on load, then re-apply + persist on every change.
applyTheme(useThemeStore.getState());
useThemeStore.subscribe((s) => {
  applyTheme(s);
  persist(s);
});
