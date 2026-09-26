import { useEffect, useState } from "react";

/** Izenzo style presets: cream (default light), black (Ink & Aqua), grid (black + ink grid). */
export type StylePreset = "cream" | "black" | "grid";
export const PRESET_KEY = "izenzo:style-preset";
export const PRESET_EVENT = "izenzo:style-preset-change";

/** Runs in <head> before first paint so the saved preset never flashes. */
export const THEME_INIT_SCRIPT = `try{var p=localStorage.getItem("${PRESET_KEY}")||"cream";var h=document.documentElement;h.setAttribute("data-theme","dark");h.setAttribute("data-app",p==="cream"?"alpha-bravo":"izenzo");if(p!=="cream")h.classList.add("dark");}catch(e){}`;

export function readPreset(): StylePreset {
  try {
    const p = localStorage.getItem(PRESET_KEY);
    return p === "black" || p === "grid" ? p : "cream";
  } catch {
    return "cream";
  }
}

export function applyStylePreset(p: StylePreset) {
  const h = document.documentElement;
  h.setAttribute("data-theme", "dark");
  h.setAttribute("data-app", p === "cream" ? "alpha-bravo" : "izenzo");
  h.classList.toggle("dark", p !== "cream");
  document.body.classList.toggle("ink-grid", p === "grid");
}

export function applyCurrentStylePreset() {
  applyStylePreset(readPreset());
}

export function setStylePreset(p: StylePreset) {
  try {
    localStorage.setItem(PRESET_KEY, p);
  } catch {
    /* session only */
  }
  applyStylePreset(p);
  window.dispatchEvent(new CustomEvent(PRESET_EVENT, { detail: p }));
}

/** Dark-mode state (black vs cream) kept in sync with the preset. */
export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    applyCurrentStylePreset();
    const sync = () => setDark(readPreset() !== "cream");
    sync();
    window.addEventListener(PRESET_EVENT, sync);
    return () => window.removeEventListener(PRESET_EVENT, sync);
  }, []);

  const set = (next: boolean) => setStylePreset(next ? "black" : "cream");
  return { dark, set, toggle: () => set(!dark) };
}
