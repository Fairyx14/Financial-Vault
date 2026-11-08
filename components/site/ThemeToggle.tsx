"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { THEME_STORAGE_KEY, type Theme } from "./theme";
import styles from "./site.module.css";

const SUN = [
  "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  "M12 2.5v2",
  "M12 19.5v2",
  "M2.5 12h2",
  "M19.5 12h2",
  "m5.3 5.3 1.4 1.4",
  "m17.3 17.3 1.4 1.4",
  "m5.3 18.7 1.4-1.4",
  "m17.3 6.7 1.4-1.4",
];
const MOON = ["M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"];

/** The theme showing right now: the visitor's saved choice, otherwise their device setting. */
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  // null until mounted: the server can't know the visitor's theme.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
    // Follow device changes while the visitor hasn't picked a theme themselves.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(currentTheme());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still applies for this visit.
    }
    setTheme(next);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggle}
      aria-pressed={theme === null ? undefined : isDark}
      aria-label="Dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Shows the icon for the mode you'd switch to. */}
      <Icon paths={isDark ? SUN : MOON} size={18} />
    </button>
  );
}
