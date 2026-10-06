"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_THEME, isThemeId, THEME_STORAGE_KEY, ThemeId, THEMES } from "./themes";

const CHANGE_EVENT = "tls-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): ThemeId {
  const current = document.documentElement.dataset.theme;
  return isThemeId(current) ? current : DEFAULT_THEME;
}

/** The visitor's chosen look. Kept on <html data-theme> and remembered per device in localStorage
 * (see THEME_INIT_SCRIPT, which restores it before first paint). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);

  const setTheme = useCallback((next: ThemeId) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode or blocked storage: the choice still applies for this visit */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { theme, setTheme, info: THEMES.find((t) => t.id === theme)! };
}
