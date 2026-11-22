/**
 * Moves vault data between this browser and the signed-in account.
 *
 * - The vaults keep reading and writing the browser copy, exactly as before.
 * - Every change (see lib/localStore.writeVault) is uploaded a moment later.
 * - Each upload only overwrites the account version it was based on. If another device
 *   saved in between, nothing is overwritten and the person is asked which copy to keep.
 * - On sign-out the browser copy is wiped, so the next person on this device sees nothing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { replaceVaultFromCloud, SAVED_EVENT, VAULTS, vaultNameForKey } from "@/lib/localStore";
import { ALL_VAULTS, EMPTY_SYNC, hasContent, type RemoteDoc, type SyncRecord, type Vault, type VaultStep } from "@/lib/syncPlan";

const RECORD_KEY = "dream-vault:sync";
const TABLE = "vault_documents";

export function readRecord(): SyncRecord {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECORD_KEY) ?? "null") as SyncRecord | null;
    if (parsed && Array.isArray(parsed.pending)) return { owner: parsed.owner ?? null, revisions: parsed.revisions ?? {}, pending: parsed.pending };
  } catch {
    // Fall through to an empty record.
  }
  return { ...EMPTY_SYNC, revisions: {}, pending: [] };
}

function writeRecord(record: SyncRecord) {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked: syncing still works for this visit.
  }
}

export const readLocal = (): Partial<Record<Vault, string | null>> =>
  Object.fromEntries(ALL_VAULTS.map((v) => [v, window.localStorage.getItem(VAULTS[v])]));

/** Wipes every vault and the sync record from this browser (used on sign-out and account deletion). */
export function clearLocalVaults() {
  for (const v of ALL_VAULTS) replaceVaultFromCloud(VAULTS[v], null);
  window.localStorage.removeItem(RECORD_KEY);
}

export async function fetchRemote(supabase: SupabaseClient): Promise<Partial<Record<Vault, RemoteDoc>>> {
  const { data, error } = await supabase.from(TABLE).select("vault, data, revision");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.vault as Vault, { data: row.data, revision: Number(row.revision) }]));
}

export type StepResult = "done" | "conflict";

/** Uploads one vault, overwriting only the account revision it was based on. */
async function upload(supabase: SupabaseClient, userId: string, vault: Vault, base: number | null): Promise<{ result: StepResult; revision?: number }> {
  const text = window.localStorage.getItem(VAULTS[vault]);
  if (!text) return { result: "done", revision: base ?? undefined };
  const data = JSON.parse(text);
  if (base === null) {
    if (!hasContent(vault, text)) return { result: "done" }; // nothing worth creating a row for
    const { data: rows, error } = await supabase.from(TABLE).insert({ user_id: userId, vault, data }).select("revision");
    if (error?.code === "23505") return { result: "conflict" }; // another device created it first
    if (error) throw error;
    return { result: "done", revision: Number(rows?.[0]?.revision) };
  }
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update({ data })
    .eq("user_id", userId)
    .eq("vault", vault)
    .eq("revision", base)
    .select("revision");
  if (error) throw error;
  if (!rows || rows.length === 0) return { result: "conflict" };
  return { result: "done", revision: Number(rows[0].revision) };
}

/** Carries out a list of steps; returns the vaults that clashed with another device's save. */
export async function runSteps(
  supabase: SupabaseClient,
  userId: string,
  steps: VaultStep[],
  remote: Partial<Record<Vault, RemoteDoc>>,
): Promise<Vault[]> {
  const record = readRecord();
  record.owner = userId;
  const conflicts: Vault[] = [];
  for (const step of steps) {
    if (step.action === "keep") continue;
    if (step.action === "download") {
      const doc = remote[step.vault];
      replaceVaultFromCloud(VAULTS[step.vault], doc ? JSON.stringify(doc.data) : null);
      if (doc) record.revisions[step.vault] = doc.revision;
      else delete record.revisions[step.vault];
      record.pending = record.pending.filter((v) => v !== step.vault);
      continue;
    }
    const { result, revision } = await upload(supabase, userId, step.vault, step.base);
    if (result === "conflict") {
      conflicts.push(step.vault);
      if (!record.pending.includes(step.vault)) record.pending.push(step.vault);
      continue;
    }
    if (revision !== undefined && !Number.isNaN(revision)) record.revisions[step.vault] = revision;
    record.pending = record.pending.filter((v) => v !== step.vault);
  }
  writeRecord(record);
  return conflicts;
}

export type SyncStatus = "saved" | "saving" | "offline" | "error" | "conflict";

/**
 * After sign-in: uploads each change shortly after it's made, retries when the connection
 * returns, and picks up changes from other devices when the page regains focus.
 * Returns a function that stops it.
 */
export function startLiveSync(
  supabase: SupabaseClient,
  userId: string,
  onStatus: (status: SyncStatus, conflicts: Vault[]) => void,
): { stop: () => void; flush: () => Promise<void> } {
  let timer: number | undefined;
  let running = false;
  let again = false;

  const flush = async () => {
    window.clearTimeout(timer);
    if (running) {
      again = true;
      return;
    }
    const record = readRecord();
    if (record.pending.length === 0) return onStatus("saved", []);
    if (!navigator.onLine) return onStatus("offline", []);
    running = true;
    onStatus("saving", []);
    try {
      const steps: VaultStep[] = record.pending.map((vault) => ({ vault, action: "upload", base: record.revisions[vault] ?? null }));
      const conflicts = await runSteps(supabase, userId, steps, {});
      onStatus(conflicts.length ? "conflict" : "saved", conflicts);
    } catch {
      onStatus(navigator.onLine ? "error" : "offline", []);
    } finally {
      running = false;
      if (again) {
        again = false;
        void flush();
      }
    }
  };

  const onSaved = (event: Event) => {
    const vault = vaultNameForKey((event as CustomEvent<string>).detail);
    if (!vault) return;
    const record = readRecord();
    if (!record.pending.includes(vault)) record.pending.push(vault);
    writeRecord(record);
    onStatus("saving", []);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void flush(), 800);
  };

  /** Downloads anything another device saved, unless this device has unsent changes. */
  const refresh = async () => {
    if (document.visibilityState !== "visible" || running) return;
    const record = readRecord();
    if (record.pending.length) return void flush();
    try {
      const remote = await fetchRemote(supabase);
      const steps: VaultStep[] = ALL_VAULTS.filter((v) => remote[v]?.revision !== record.revisions[v]).map((vault) => ({ vault, action: "download" }));
      if (steps.length) await runSteps(supabase, userId, steps, remote);
      onStatus("saved", []);
    } catch {
      onStatus(navigator.onLine ? "error" : "offline", []);
    }
  };

  const onOnline = () => void flush();
  const onOffline = () => onStatus("offline", []);
  window.addEventListener(SAVED_EVENT, onSaved);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  void flush();

  return {
    flush,
    stop: () => {
      window.clearTimeout(timer);
      window.removeEventListener(SAVED_EVENT, onSaved);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    },
  };
}
