/**
 * Decides how a browser's saved vaults and an account's saved vaults are brought together
 * when someone signs in. Free of browser and network code, so every case can be tested.
 *
 * The browser copy is the working copy; the account copy is the shared one. Each browser
 * remembers (in its sync record) whose data it holds, the account revision it last matched,
 * and which vaults have changes not yet uploaded.
 */

export type Vault = "savings" | "investments" | "investment-goals" | "budget";
export const ALL_VAULTS: Vault[] = ["savings", "investments", "investment-goals", "budget"];

export interface RemoteDoc {
  data: unknown;
  revision: number;
}

/** What this browser remembers about syncing. Kept next to the vaults in local storage. */
export interface SyncRecord {
  /** The account whose data this browser holds; null for data saved before accounts existed. */
  owner: string | null;
  /** Account revision each vault last matched. */
  revisions: Partial<Record<Vault, number>>;
  /** Vaults changed in this browser and not yet uploaded. */
  pending: Vault[];
}

export const EMPTY_SYNC: SyncRecord = { owner: null, revisions: {}, pending: [] };

/** True when a saved vault holds anything the person entered (not just an empty shell). */
export function hasContent(vault: Vault, text: string | null | undefined): boolean {
  if (!text) return false;
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    const filled = (key: string) => {
      const v = value?.[key];
      return Array.isArray(v) ? v.length > 0 : !!v && typeof v === "object" && Object.keys(v).length > 0;
    };
    switch (vault) {
      case "savings":
      case "investment-goals":
        return filled("goals");
      case "investments":
        return filled("investments");
      case "budget":
        return ["incomes", "expenses", "customCategories", "budgets", "allocations"].some(filled);
    }
  } catch {
    return false;
  }
}

export type VaultStep =
  /** Replace the browser copy with the account copy (or clear it if the account has none). */
  | { vault: Vault; action: "download" }
  /** Upload the browser copy. `base` is the revision it was based on (null = new to the account). */
  | { vault: Vault; action: "upload"; base: number | null }
  /** Nothing to do. */
  | { vault: Vault; action: "keep" };

export type SignInPlan =
  | { kind: "ready"; steps: VaultStep[] }
  /** Browser has data from before accounts and the account is empty: offer to move it in. */
  | { kind: "ask-import" }
  /** Browser has pre-account data and the account has data too: ask which to keep. */
  | { kind: "ask-choose" };

export function planSignIn(
  userId: string,
  record: SyncRecord,
  local: Partial<Record<Vault, string | null>>,
  remote: Partial<Record<Vault, RemoteDoc>>,
): SignInPlan {
  const localFilled = ALL_VAULTS.some((v) => hasContent(v, local[v]));
  const remoteFilled = ALL_VAULTS.some((v) => remote[v] && hasContent(v, JSON.stringify(remote[v]!.data)));

  // This browser already holds this account's data: upload unsent changes, download the rest.
  if (record.owner === userId) {
    return {
      kind: "ready",
      steps: ALL_VAULTS.map((vault): VaultStep => {
        if (record.pending.includes(vault)) return { vault, action: "upload", base: record.revisions[vault] ?? null };
        if (remote[vault]?.revision === record.revisions[vault] && remote[vault]) return { vault, action: "keep" };
        return { vault, action: "download" };
      }),
    };
  }

  // Someone else's data, or nothing worth keeping: take the account's copy.
  if (record.owner !== null || !localFilled) return { kind: "ready", steps: ALL_VAULTS.map((vault) => ({ vault, action: "download" })) };

  // Data saved before accounts existed: never discard it without asking.
  return remoteFilled ? { kind: "ask-choose" } : { kind: "ask-import" };
}

/** Steps once the person has chosen to move this browser's data into the account. */
export function importSteps(remote: Partial<Record<Vault, RemoteDoc>>): VaultStep[] {
  return ALL_VAULTS.map((vault) => ({ vault, action: "upload", base: remote[vault]?.revision ?? null }));
}

/** Steps once the person has chosen to use the account's data in this browser. */
export const downloadSteps = (): VaultStep[] => ALL_VAULTS.map((vault) => ({ vault, action: "download" }));
