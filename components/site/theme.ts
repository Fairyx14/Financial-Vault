export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "dream-vault:theme";

/**
 * Runs in <head> before the page paints, so a saved choice never flashes the wrong theme.
 * With no saved choice the page follows the device setting via CSS (prefers-color-scheme).
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
