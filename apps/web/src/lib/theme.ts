export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "vf-theme-pref";

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function readStoredThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* private mode */
  }
  return "system";
}

export function applyThemeToDocument(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

export function persistThemePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

/** Called from index.html before React hydrates to reduce theme flash. */
export function initThemeFromStorage() {
  const pref = readStoredThemePreference();
  applyThemeToDocument(resolveTheme(pref));
}
