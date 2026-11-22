/**
 * The one place vault data is written to the browser.
 *
 * The browser copy is the working copy each vault reads and writes, exactly as before.
 * Writing through here also tells the account sync (components/auth/CloudSync) that a
 * vault changed, so it can upload it. Writes that don't change anything are skipped, so
 * just opening a page never triggers an upload.
 */

/** Every vault's storage key and the name it has in the database. */
export const VAULTS = {
  savings: "dream-vault:v1",
  investments: "dream-vault:investments:v1",
  "investment-goals": "dream-vault:investment-goals:v1",
  budget: "dream-vault:budget:v1",
} as const;

export type VaultName = keyof typeof VAULTS;

export const VAULT_NAMES = Object.keys(VAULTS) as VaultName[];

export const vaultNameForKey = (key: string): VaultName | undefined => VAULT_NAMES.find((name) => VAULTS[name] === key);

/** Fired on window after a vault's saved copy changes in this tab. */
export const SAVED_EVENT = "dream-vault:saved";

/** Returns false when the browser refuses to store data (private mode, full disk…). */
export function writeVault(key: string, text: string): boolean {
  try {
    if (window.localStorage.getItem(key) === text) return true;
    window.localStorage.setItem(key, text);
    window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Replaces a vault's saved copy with data from the account (or removes it) and tells any
 * open vault in this tab to reload, using the same "storage" event other tabs trigger.
 * Doesn't fire SAVED_EVENT, so downloaded data isn't uploaded straight back.
 */
export function replaceVaultFromCloud(key: string, text: string | null) {
  const old = window.localStorage.getItem(key);
  if (old === text) return;
  if (text === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, text);
  window.dispatchEvent(new StorageEvent("storage", { key, oldValue: old, newValue: text, storageArea: window.localStorage }));
}
