"use client";

import { useState, type FormEvent } from "react";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import planner from "../DreamVault.module.css";
import vault from "../Vault.module.css";
import styles from "./auth.module.css";

export const MIN_PASSWORD = 8;

/** Plain-English versions of Supabase's sign-in errors. */
export function authMessage(error: AuthError | Error | null | undefined): string {
  if (!error) return "";
  const text = `${"code" in error ? error.code : ""} ${error.message}`.toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid_credentials")) return "That email and password don't match an account.";
  if (text.includes("not confirmed")) return "Please confirm your email address first. Check your inbox for the link we sent.";
  if (text.includes("already registered") || text.includes("user_already_exists")) return "There's already an account with this email. Sign in instead.";
  if (text.includes("weak") || text.includes("password should")) return `Choose a stronger password: at least ${MIN_PASSWORD} characters, ideally a mix of words, numbers and symbols.`;
  if (text.includes("rate") || text.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (text.includes("same_password") || text.includes("different from the old")) return "Your new password must be different from your current one.";
  if (text.includes("fetch") || text.includes("network")) return "We couldn't reach the account service. Check your internet connection and try again.";
  return "Something went wrong. Please try again.";
}

const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

interface AuthFieldProps {
  id: string;
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  error?: string;
  hint?: string;
}

export function AuthField({ id, label, type, value, onChange, autoComplete, error, hint }: AuthFieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={planner.field}>
      <label htmlFor={id} className={planner.label}>
        {label}
      </label>
      <div className={`${planner.inputWrap} ${error ? planner.inputWrapError : ""}`}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={planner.input}
        />
      </div>
      {hint && (
        <p id={`${id}-hint`} className={planner.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={planner.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <label className={styles.showPassword}>
      <input type="checkbox" checked={shown} onChange={onToggle} /> Show password
    </label>
  );
}

const focusFirstError = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

type Mode = "sign-in" | "sign-up" | "forgot";

/** Sign in, create an account, or ask for a password-reset email. */
export function AuthPanel({ supabase }: { supabase: SupabaseClient }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const errors: { email?: string; password?: string; confirm?: string } = {};
  if (!looksLikeEmail(email)) errors.email = "Enter your email address, for example name@example.com.";
  if (mode !== "forgot") {
    if (!password) errors.password = "Enter your password.";
    else if (mode === "sign-up" && password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (mode === "sign-up" && confirm !== password) errors.confirm = "The two passwords don't match.";
  }
  const shown = (field: keyof typeof errors) => (submitted ? errors[field] : undefined);

  const switchTo = (next: Mode) => {
    setMode(next);
    setSubmitted(false);
    setError("");
    setNotice("");
    setPassword("");
    setConfirm("");
    requestAnimationFrame(() => document.getElementById("auth-title")?.focus());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError("");
    setNotice("");
    if (Object.keys(errors).length) return focusFirstError();
    setBusy(true);
    try {
      const here = `${window.location.origin}${window.location.pathname}`;
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(authMessage(error));
      } else if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: here } });
        if (error) setError(authMessage(error));
        else if (!data.session) {
          setNotice(`Almost there. We've sent a confirmation link to ${email.trim()}. Open it, then sign in here.`);
          setMode("sign-in");
          setPassword("");
          setConfirm("");
          setSubmitted(false);
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) setError(authMessage(error));
        // Same message whether or not the email has an account, so it can't be used to look people up.
        else setNotice(`If ${email.trim()} has a Dream Vault account, we've sent a link to reset the password. It may take a minute to arrive.`);
      }
    } catch (e) {
      setError(authMessage(e as Error));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "sign-in" ? "Sign in to your vaults" : mode === "sign-up" ? "Create your Dream Vault account" : "Reset your password";

  return (
    <section className={styles.panel} aria-labelledby="auth-title">
      <h2 id="auth-title" tabIndex={-1} className={styles.title}>
        {title}
      </h2>
      <p className={styles.lead}>
        {mode === "sign-in"
          ? "Your savings, investments and budget are saved to your account, so they're on every device you sign in on."
          : mode === "sign-up"
            ? "One account keeps all three vaults in sync across your phone and computer."
            : "Enter your account's email address and we'll send you a link to choose a new password."}
      </p>

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      <form className={styles.form} onSubmit={submit} noValidate aria-labelledby="auth-title">
        <AuthField id="auth-email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" error={shown("email")} />
        {mode !== "forgot" && (
          <AuthField
            id="auth-password"
            label={mode === "sign-up" ? "Choose a password" : "Password"}
            type={show ? "text" : "password"}
            value={password}
            onChange={setPassword}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            error={shown("password")}
            hint={mode === "sign-up" ? `At least ${MIN_PASSWORD} characters. A short phrase of three or four words works well.` : undefined}
          />
        )}
        {mode === "sign-up" && (
          <AuthField
            id="auth-confirm"
            label="Type the password again"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            error={shown("confirm")}
          />
        )}
        {mode !== "forgot" && <PasswordToggle shown={show} onToggle={() => setShow((s) => !s)} />}

        {error && (
          <p className={vault.formError} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={vault.buttonPrimary} disabled={busy} aria-busy={busy || undefined}>
          {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
        </button>
      </form>

      <div className={styles.switchRow}>
        {mode === "sign-in" ? (
          <>
            <button type="button" className={styles.linkButton} onClick={() => switchTo("sign-up")}>
              New here? Create an account
            </button>
            <button type="button" className={styles.linkButton} onClick={() => switchTo("forgot")}>
              Forgot your password?
            </button>
          </>
        ) : (
          <button type="button" className={styles.linkButton} onClick={() => switchTo("sign-in")}>
            {mode === "sign-up" ? "Already have an account? Sign in" : "Back to sign in"}
          </button>
        )}
      </div>
    </section>
  );
}
