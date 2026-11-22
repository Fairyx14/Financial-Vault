"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog, { type ConfirmRequest } from "../ConfirmDialog";
import { AuthField, authMessage, MIN_PASSWORD } from "./AuthForms";
import { clearLocalVaults } from "./cloudSync";
import { useAccount } from "./RequireAccount";
import vault from "../Vault.module.css";
import styles from "./auth.module.css";

const formatDate = (iso?: string) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "–";

export default function AccountSettings() {
  const { supabase, user, signOut } = useAccount();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const errors: { password?: string; confirm?: string } = {};
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (confirm !== password) errors.confirm = "The two passwords don't match.";

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setMessage(null);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#password-form [aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage({ kind: "error", text: authMessage(error) });
    setPassword("");
    setConfirm("");
    setSubmitted(false);
    setMessage({ kind: "ok", text: "Your password has been changed." });
  };

  const askDelete = () =>
    setRequest({
      title: "Delete your account?",
      message:
        "This permanently deletes your Dream Vault account and everything saved in it: savings goals, investments and your budget, on every device. It can't be undone. If you want a copy, download your Budget Vault from its Export tab first.",
      confirmLabel: "Delete my account",
      onConfirm: async () => {
        setDeleteError("");
        const { error } = await supabase.rpc("delete_my_account");
        if (error) return setDeleteError("We couldn't delete your account just now. Nothing was removed. Please try again.");
        clearLocalVaults();
        await supabase.auth.signOut();
        router.push("/");
      },
    });

  return (
    <div className={styles.accountGrid}>
      <section className={styles.panel} aria-labelledby="account-title">
        <h2 id="account-title" className={styles.title}>
          Your account
        </h2>
        <dl className={styles.facts}>
          <dt>Email address</dt>
          <dd>{user.email}</dd>
          <dt>Member since</dt>
          <dd>{formatDate(user.created_at)}</dd>
        </dl>
        <p className={styles.small}>
          Your savings, investments and budget are saved to this account and appear on any device where you sign in.
        </p>
        <div className={styles.choiceRow}>
          <button
            type="button"
            className={vault.buttonSecondary}
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
        <p className={styles.small}>Signing out also removes your data from this browser. It stays safe in your account.</p>
      </section>

      <section className={styles.panel} aria-labelledby="password-title">
        <h2 id="password-title" className={styles.title}>
          Change password
        </h2>
        <form id="password-form" className={styles.form} onSubmit={changePassword} noValidate aria-labelledby="password-title">
          <AuthField
            id="new-password"
            label="New password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={submitted ? errors.password : undefined}
            hint={`At least ${MIN_PASSWORD} characters.`}
          />
          <AuthField
            id="new-password-confirm"
            label="Type it again"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            error={submitted ? errors.confirm : undefined}
          />
          {message && (
            <p className={message.kind === "ok" ? styles.notice : vault.formError} role={message.kind === "ok" ? "status" : "alert"}>
              {message.text}
            </p>
          )}
          <button type="submit" className={vault.buttonPrimary} disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>

      <section className={`${styles.panel} ${styles.danger}`} aria-labelledby="delete-title">
        <h2 id="delete-title" className={styles.title}>
          Delete account
        </h2>
        <p className={styles.small}>
          Permanently deletes your account and all the data saved in it. This can&rsquo;t be undone.
        </p>
        {deleteError && (
          <p className={vault.formError} role="alert">
            {deleteError}
          </p>
        )}
        <div className={styles.choiceRow}>
          <button type="button" className={vault.buttonDanger} onClick={askDelete}>
            Delete my account
          </button>
        </div>
      </section>

      <ConfirmDialog request={request} onClose={() => setRequest(null)} />
    </div>
  );
}
