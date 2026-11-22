"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabase, supabaseConfigured } from "@/lib/supabaseClient";
import { AuthField, authMessage, MIN_PASSWORD } from "./AuthForms";
import vault from "../Vault.module.css";
import styles from "./auth.module.css";

type Phase = "checking" | "ready" | "expired" | "done";

/** Opened from the password-reset email. The link signs the person in just long enough to choose a new password. */
export default function ResetPassword() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabaseConfigured) return setPhase("expired");
    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setPhase((p) => (p === "done" ? p : "ready"));
    });
    // Give the link a moment to be checked before saying it didn't work.
    const timer = window.setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      setPhase((p) => (p === "checking" ? (s.session ? "ready" : "expired") : p));
    }, 2500);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const errors: { password?: string; confirm?: string } = {};
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (confirm !== password) errors.confirm = "The two passwords don't match.";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError("");
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(authMessage(error));
    window.history.replaceState(null, "", "/reset-password");
    setPhase("done");
  };

  if (phase === "checking") {
    return (
      <p className={vault.loading} aria-busy="true">
        Checking your reset link…
      </p>
    );
  }

  if (phase === "expired") {
    return (
      <section className={styles.panel} aria-labelledby="reset-title">
        <h2 id="reset-title" className={styles.title}>
          This link has expired or was already used
        </h2>
        <p className={styles.lead}>Reset links work once and only for a short time. Ask for a new one from the sign-in page.</p>
        <Link href="/vault" className={vault.buttonPrimary}>
          Go to sign in
        </Link>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section className={styles.panel} aria-labelledby="reset-title">
        <h2 id="reset-title" className={styles.title}>
          Password changed
        </h2>
        <p className={styles.lead} role="status">
          You&rsquo;re signed in with your new password.
        </p>
        <Link href="/vault" className={vault.buttonPrimary}>
          Open my vaults
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="reset-title">
      <h2 id="reset-title" className={styles.title}>
        Choose a new password
      </h2>
      <form className={styles.form} onSubmit={submit} noValidate aria-labelledby="reset-title">
        <AuthField
          id="reset-password"
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={submitted ? errors.password : undefined}
          hint={`At least ${MIN_PASSWORD} characters.`}
        />
        <AuthField
          id="reset-confirm"
          label="Type it again"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={submitted ? errors.confirm : undefined}
        />
        {error && (
          <p className={vault.formError} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={vault.buttonPrimary} disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </section>
  );
}
