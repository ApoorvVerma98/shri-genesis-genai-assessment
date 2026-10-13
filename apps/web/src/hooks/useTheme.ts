import { useCallback, useEffect, useState } from "react";
import {
  applyThemeToDocument,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
  type ThemePreference,
} from "../lib/theme";

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredThemePreference());
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolveTheme(readStoredThemePreference()));

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    persistThemePreference(pref);
    const next = resolveTheme(pref);
    setResolved(next);
    applyThemeToDocument(next);
  }, []);

  useEffect(() => {
    applyThemeToDocument(resolved);
  }, [resolved]);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = resolveTheme("system");
      setResolved(next);
      applyThemeToDocument(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  return { preference, resolved, setPreference };
}
