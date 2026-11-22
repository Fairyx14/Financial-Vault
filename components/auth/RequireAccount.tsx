"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "@/lib/supabaseClient";
import { downloadSteps, importSteps, planSignIn, type RemoteDoc, type Vault } from "@/lib/syncPlan";
import { clearLocalVaults, fetchRemote, readLocal, readRecord, runSteps, startLiveSync, type SyncStatus } from "./cloudSync";
import { AuthPanel } from "./AuthForms";
import vault from "../Vault.module.css";
import styles from "./auth.module.css";

type Phase = "loading" | "signed-out" | "syncing" | "ask-import" | "ask-choose" | "ready" | "error";

interface AccountContextValue {
  supabase: SupabaseClient;
  user: User;
  status: SyncStatus;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

/** The signed-in account, for pages inside <RequireAccount>. */
export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside <RequireAccount>");
  return value;
}

const VAULT_LABEL: Record<Vault, string> = {
  savings: "Savings Vault",
  investments: "Investment Vault",
  "investment-goals": "Investment goals",
  budget: "Budget Vault",
};

/**
 * Shows its children only to a signed-in person, after their account data has been brought
 * into this browser. Everyone else sees the sign-in form.
 */
export default function RequireAccount({ children }: { children: ReactNode }) {
  if (!supabaseConfigured) {
    return (
      <div className={vault.emptyState} role="alert">
        <h2 className={vault.emptyTitle}>Accounts aren&rsquo;t set up yet</h2>
        <p className={vault.emptyText}>
          This copy of Dream Vault isn&rsquo;t connected to its database, so signing in isn&rsquo;t available. If you run
          the site, add the Supabase settings described in .env.local.example.
        </p>
      </div>
    );
  }
  return <AccountGate>{children}</AccountGate>;
}

function AccountGate({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [conflicts, setConflicts] = useState<Vault[]>([]);
  const [remote, setRemote] = useState<Partial<Record<Vault, RemoteDoc>>>({});
  const [busy, setBusy] = useState(false);
  const live = useRef<ReturnType<typeof startLiveSync> | null>(null);
  const syncedFor = useRef<string | null>(null);

  // Follow the sign-in state (including other tabs and expired sessions).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session) setPhase("signed-out");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        syncedFor.current = null;
        setPhase("signed-out");
      }
    });
    // Tidy the address bar after an email confirmation link (?code=…).
    if (new URLSearchParams(window.location.search).has("code")) {
      window.setTimeout(() => window.history.replaceState(null, "", window.location.pathname + window.location.hash), 1500);
    }
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const goLive = useCallback(
    (userId: string) => {
      live.current?.stop();
      live.current = startLiveSync(supabase, userId, (next, clashes) => {
        setStatus(next);
        if (clashes.length) setConflicts(clashes);
      });
      setPhase("ready");
    },
    [supabase],
  );

  // Once signed in: fetch the account's data and decide how it meets this browser's copy.
  useEffect(() => {
    if (!user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    setPhase("syncing");
    (async () => {
      try {
        const remoteDocs = await fetchRemote(supabase);
        setRemote(remoteDocs);
        const plan = planSignIn(user.id, readRecord(), readLocal(), remoteDocs);
        if (plan.kind === "ready") {
          const clashes = await runSteps(supabase, user.id, plan.steps, remoteDocs);
          if (clashes.length) setConflicts(clashes);
          goLive(user.id);
        } else setPhase(plan.kind);
      } catch {
        syncedFor.current = null;
        setPhase("error");
      }
    })();
  }, [user, supabase, goLive]);

  useEffect(() => () => live.current?.stop(), []);

  const choose = async (keepBrowser: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      const clashes = await runSteps(supabase, user.id, keepBrowser ? importSteps(remote) : downloadSteps(), remote);
      if (clashes.length) setConflicts(clashes);
      goLive(user.id);
    } catch {
      setPhase("error");
    } finally {
      setBusy(false);
    }
  };

  /** Settles a clash with another device by keeping one copy for each clashing vault. */
  const resolve = async (keepThisDevice: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      const latest = await fetchRemote(supabase);
      const steps = conflicts.map((v) =>
        keepThisDevice ? ({ vault: v, action: "upload", base: latest[v]?.revision ?? null } as const) : ({ vault: v, action: "download" } as const),
      );
      const clashes = await runSteps(supabase, user.id, steps, latest);
      setConflicts(clashes);
      setStatus(clashes.length ? "conflict" : "saved");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  };

  const signOut = useCallback(async () => {
    await live.current?.flush();
    live.current?.stop();
    live.current = null;
    clearLocalVaults();
    await supabase.auth.signOut();
  }, [supabase]);

  const syncNow = useCallback(async () => {
    await live.current?.flush();
  }, []);

  if (phase === "loading" || phase === "syncing") {
    return (
      <p className={vault.loading} aria-busy="true">
        {phase === "loading" ? "Checking your account…" : "Loading your vaults from your account…"}
      </p>
    );
  }

  if (phase === "signed-out" || !user) return <AuthPanel supabase={supabase} />;

  if (phase === "error") {
    return (
      <div className={vault.emptyState} role="alert">
        <h2 className={vault.emptyTitle}>We couldn&rsquo;t load your account</h2>
        <p className={vault.emptyText}>Check your internet connection, then try again. Nothing has been changed.</p>
        <button
          type="button"
          className={vault.buttonPrimary}
          onClick={() => {
            syncedFor.current = null;
            setUser({ ...user });
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (phase === "ask-import" || phase === "ask-choose") {
    return (
      <section className={styles.panel} aria-labelledby="move-title">
        <h2 id="move-title" className={styles.title}>
          {phase === "ask-import" ? "Move this browser's data into your account?" : "Which data do you want to keep?"}
        </h2>
        <p className={styles.lead}>
          {phase === "ask-import"
            ? "This browser has savings, investments or budget data from before you had an account. Moving it in means it's backed up and available on all your devices."
            : "This browser has data from before you had an account, and your account already has data too. Choose one: the other copy will be replaced."}
        </p>
        <div className={styles.choiceRow}>
          <button type="button" className={vault.buttonPrimary} disabled={busy} onClick={() => choose(true)}>
            {phase === "ask-import" ? "Yes, move it into my account" : "Use this browser's data"}
          </button>
          <button type="button" className={vault.buttonSecondary} disabled={busy} onClick={() => choose(false)}>
            {phase === "ask-import" ? "No, start with an empty account" : "Use my account's data"}
          </button>
        </div>
        <p className={styles.small}>
          {phase === "ask-import"
            ? "If you start empty, this browser's old data is removed from this device."
            : "Not sure? Choose your account's data. You can download a copy of the Budget Vault from its Export tab first."}
        </p>
      </section>
    );
  }

  return (
    <AccountContext.Provider value={{ supabase, user, status, syncNow, signOut }}>
      <AccountBar email={user.email ?? ""} status={status} onSignOut={signOut} onRetry={syncNow} />
      {conflicts.length > 0 && (
        <div className={styles.conflict} role="alert">
          <p>
            <strong>{conflicts.map((v) => VAULT_LABEL[v]).join(" and ")}</strong> changed on another device while you were
            editing here. Which version do you want to keep?
          </p>
          <div className={styles.choiceRow}>
            <button type="button" className={vault.buttonSecondary} disabled={busy} onClick={() => resolve(false)}>
              Use the other device&rsquo;s version
            </button>
            <button type="button" className={vault.buttonSecondary} disabled={busy} onClick={() => resolve(true)}>
              Keep this device&rsquo;s version
            </button>
          </div>
        </div>
      )}
      {children}
    </AccountContext.Provider>
  );
}

const STATUS_TEXT: Record<SyncStatus, string> = {
  saved: "Saved to your account",
  saving: "Saving…",
  offline: "Offline: changes will save when you're back online",
  error: "Couldn't save just now",
  conflict: "Needs your choice",
};

function AccountBar({ email, status, onSignOut, onRetry }: { email: string; status: SyncStatus; onSignOut: () => Promise<void>; onRetry: () => Promise<void> }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <div className={styles.accountBar}>
      <p className={`${styles.syncStatus} ${styles[`sync_${status}`]}`} role="status" aria-live="polite">
        <span className={styles.syncDot} aria-hidden="true" />
        {STATUS_TEXT[status]}
        {status === "error" && (
          <button type="button" className={styles.linkButton} onClick={() => void onRetry()}>
            Try again
          </button>
        )}
      </p>
      <p className={styles.accountWho}>
        <span className="visually-hidden">Signed in as </span>
        <span className={styles.email} title={email}>
          {email}
        </span>
        <Link href="/account" className={styles.linkButton}>
          Account
        </Link>
        <button
          type="button"
          className={styles.linkButton}
          disabled={leaving}
          onClick={async () => {
            setLeaving(true);
            await onSignOut();
            setLeaving(false);
          }}
        >
          {leaving ? "Signing out…" : "Sign out"}
        </button>
      </p>
    </div>
  );
}
