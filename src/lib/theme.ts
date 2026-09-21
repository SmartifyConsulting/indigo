import { useEffect, useState } from "react";

const KEY = "indigro-theme";

/** Runs in <head> before first paint so a saved dark choice never flashes light. Default is always light. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

/** Dark-mode state backed by the <html> class and localStorage. */
export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const set = (next: boolean) => {
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* storage unavailable: the choice lasts for this session only */
    }
    setDark(next);
  };

  return { dark, set, toggle: () => set(!dark) };
}
