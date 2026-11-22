"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import ConfirmDialog, { type ConfirmRequest } from "../ConfirmDialog";
import { useAccount } from "../auth/RequireAccount";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import styles from "./admin.module.css";

/*
 * The admin area. What it can show and do is decided by the database functions in
 * supabase/migrations/20261123000000_admin.sql, which refuse anyone who isn't an admin.
 * This page only decides what to display.
 */

interface Overview {
  total: number;
  confirmed: number;
  suspended: number;
  new_7d: number;
  new_30d: number;
  active_7d: number;
  active_30d: number;
  admins: number;
  vaults: Record<string, number>;
  signups_by_week: { week: string; count: number }[] | null;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  suspended: boolean;
  is_admin: boolean;
  vaults: string[];
  data_updated_at: string | null;
  total_count: number;
}

interface Activity {
  at: string;
  admin_email: string | null;
  action: "suspend" | "unsuspend" | "delete";
  target_email: string | null;
}

type Tab = "overview" | "accounts" | "activity";

const VAULT_LABEL: Record<string, string> = {
  savings: "Savings Vault",
  investments: "Investment Vault",
  "investment-goals": "Investment goals",
  budget: "Budget Vault",
};

const PAGE_SIZE = 25;

const day = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : "Never";
const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const weekLabel = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00`));

export default function AdminArea() {
  const { supabase } = useAccount();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    supabase.rpc("am_i_admin").then(({ data, error }) => setAllowed(!error && data === true));
  }, [supabase]);

  if (allowed === null) {
    return (
      <p className={vault.loading} aria-busy="true">
        Checking access…
      </p>
    );
  }

  if (!allowed) {
    return (
      <div className={vault.emptyState}>
        <h1 className={vault.emptyTitle}>We couldn&rsquo;t find that page</h1>
        <p className={vault.emptyText}>The page you were looking for doesn&rsquo;t exist.</p>
        <Link href="/" className={vault.buttonPrimary}>
          Go to the home page
        </Link>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "accounts", label: "Accounts" },
    { id: "activity", label: "Activity log" },
  ];

  return (
    <div className={styles.admin}>
      <h1 className={styles.pageTitle}>Admin</h1>
      <p className={styles.lead}>
        Account details and usage only. Users&rsquo; savings, investment and budget figures aren&rsquo;t shown here.
      </p>
      <nav aria-label="Admin sections" className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "overview" && <OverviewPanel />}
      {tab === "accounts" && <AccountsPanel />}
      {tab === "activity" && <ActivityPanel />}
    </div>
  );
}

function ErrorNote({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className={styles.error} role="alert">
      <p>{text}</p>
      <button type="button" className={vault.buttonSecondary} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

/* ---------- Overview ---------- */

function OverviewPanel() {
  const { supabase } = useAccount();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    supabase.rpc("admin_overview").then(({ data, error }) => (error ? setError(true) : setData(data as Overview)));
  }, [supabase]);

  useEffect(load, [load]);

  if (error) return <ErrorNote text="We couldn't load the overview." onRetry={load} />;
  if (!data) return <p className={vault.loading} aria-busy="true">Loading the overview…</p>;

  const weeks = data.signups_by_week ?? [];
  const busiest = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <section aria-labelledby="overview-title" className={styles.panel}>
      <h2 id="overview-title" className={styles.sectionTitle}>
        Overview
      </h2>
      <dl className={`${inv.tiles} ${styles.tiles}`}>
        <Tile label="Accounts" value={data.total} note={`${data.confirmed} confirmed email`} />
        <Tile label="New, last 7 days" value={data.new_7d} note={`${data.new_30d} in the last 30 days`} />
        <Tile label="Signed in, last 7 days" value={data.active_7d} note={`${data.active_30d} in the last 30 days`} />
        <Tile label="Suspended" value={data.suspended} note={`${data.admins} ${data.admins === 1 ? "admin" : "admins"}`} />
      </dl>

      <div className={styles.grid}>
        <section className={vault.card} aria-labelledby="weeks-title">
          <h3 id="weeks-title" className={vault.cardTitle}>
            New accounts per week
          </h3>
          <p className={vault.muted}>The last 12 weeks, oldest first.</p>
          <ol className={styles.bars}>
            {weeks.map((w) => (
              <li key={w.week}>
                <span className={styles.barLabel}>w/c {weekLabel(w.week)}</span>
                <span className={styles.barTrack} aria-hidden="true">
                  <span style={{ width: `${(w.count / busiest) * 100}%` }} />
                </span>
                <span className={styles.barValue}>{w.count}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={vault.card} aria-labelledby="vaults-title">
          <h3 id="vaults-title" className={vault.cardTitle}>
            Vaults in use
          </h3>
          <p className={vault.muted}>Accounts that have saved data in each vault (including any they&rsquo;ve since emptied).</p>
          <ul className={styles.vaultList}>
            {Object.keys(VAULT_LABEL).map((key) => (
              <li key={key}>
                <span>{VAULT_LABEL[key]}</span>
                <strong>{data.vaults[key] ?? 0}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

function Tile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className={inv.tile}>
      <dt>{label}</dt>
      <dd>{value.toLocaleString("en-GB")}</dd>
      <dd className={inv.tileNote}>{note}</dd>
    </div>
  );
}

/* ---------- Accounts ---------- */

function AccountsPanel() {
  const { supabase, user } = useAccount();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState(false);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(() => {
    setError(false);
    supabase
      .rpc("admin_list_users", { search, page_number: page, page_size: PAGE_SIZE })
      .then(({ data, error }) => (error ? setError(true) : setRows((data ?? []) as AdminUser[])));
  }, [supabase, search, page]);

  useEffect(load, [load]);

  const total = rows?.[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  };

  const act = (row: AdminUser, kind: "suspend" | "unsuspend" | "delete") => {
    const copy = {
      suspend: {
        title: `Suspend ${row.email}?`,
        message: "They'll be signed out and won't be able to sign in until you unsuspend them. Their data is kept.",
        label: "Suspend account",
      },
      unsuspend: {
        title: `Unsuspend ${row.email}?`,
        message: "They'll be able to sign in again straight away.",
        label: "Unsuspend account",
      },
      delete: {
        title: `Delete ${row.email}?`,
        message:
          "This permanently deletes the account and everything saved in it: savings goals, investments and budget. It can't be undone.",
        label: "Delete permanently",
      },
    }[kind];
    setRequest({
      title: copy.title,
      message: copy.message,
      confirmLabel: copy.label,
      onConfirm: async () => {
        const { error } =
          kind === "delete"
            ? await supabase.rpc("admin_delete_user", { target: row.id })
            : await supabase.rpc("admin_set_suspended", { target: row.id, suspend: kind === "suspend" });
        if (error) {
          setMessage({ kind: "error", text: error.message || "That didn't work. Nothing was changed." });
        } else {
          setMessage({
            kind: "ok",
            text: kind === "delete" ? `${row.email} was deleted.` : `${row.email} was ${kind === "suspend" ? "suspended" : "unsuspended"}.`,
          });
          load();
        }
        setTimeout(() => headingRef.current?.focus(), 0);
      },
    });
  };

  return (
    <section aria-labelledby="accounts-title" className={styles.panel}>
      <h2 id="accounts-title" ref={headingRef} tabIndex={-1} className={styles.sectionTitle}>
        Accounts
      </h2>

      <form className={styles.searchRow} onSubmit={submitSearch} role="search">
        <label className={inv.searchField}>
          <span className="visually-hidden">Search accounts by email</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email" autoComplete="off" />
        </label>
        <button type="submit" className={vault.buttonSecondary}>
          Search
        </button>
      </form>

      {message && (
        <p className={message.kind === "ok" ? styles.ok : styles.errorText} role={message.kind === "ok" ? "status" : "alert"}>
          {message.text}
        </p>
      )}

      {error ? (
        <ErrorNote text="We couldn't load the accounts." onRetry={load} />
      ) : !rows ? (
        <p className={vault.loading} aria-busy="true">Loading accounts…</p>
      ) : rows.length === 0 ? (
        <p className={inv.noResults}>{search ? `No accounts match "${search}".` : "No accounts yet."}</p>
      ) : (
        <>
          <p className={styles.count} aria-live="polite">
            {total.toLocaleString("en-GB")} {total === 1 ? "account" : "accounts"}
            {search && ` matching "${search}"`}
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="visually-hidden">Accounts, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Last sign-in</th>
                  <th scope="col">Status</th>
                  <th scope="col">Vaults used</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const self = row.id === user.id;
                  return (
                    <tr key={row.id}>
                      <th scope="row" className={styles.email} data-label="Email">
                        {row.email}
                      </th>
                      <td data-label="Joined">{day(row.created_at)}</td>
                      <td data-label="Last sign-in">{day(row.last_sign_in_at)}</td>
                      <td data-label="Status">
                        <span className={styles.badges}>
                          {row.is_admin && <span className={`${styles.badge} ${styles.badgeAdmin}`}>Admin</span>}
                          {row.suspended && <span className={`${styles.badge} ${styles.badgeBad}`}>Suspended</span>}
                          {!row.suspended && (
                            <span className={`${styles.badge} ${row.confirmed ? styles.badgeGood : styles.badgeWarn}`}>
                              {row.confirmed ? "Active" : "Email not confirmed"}
                            </span>
                          )}
                        </span>
                      </td>
                      <td data-label="Vaults used">
                        {row.vaults.length ? row.vaults.map((v) => VAULT_LABEL[v] ?? v).join(", ") : "None yet"}
                      </td>
                      <td className={styles.actions}>
                        {self || row.is_admin ? (
                          <span className={styles.muted}>{self ? "You" : "Admin"}</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={vault.buttonSecondary}
                              onClick={() => act(row, row.suspended ? "unsuspend" : "suspend")}
                              aria-label={`${row.suspended ? "Unsuspend" : "Suspend"} ${row.email}`}
                            >
                              {row.suspended ? "Unsuspend" : "Suspend"}
                            </button>
                            <button type="button" className={vault.buttonDanger} onClick={() => act(row, "delete")} aria-label={`Delete ${row.email}`}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav aria-label="Account pages" className={styles.pager}>
              <button type="button" className={vault.buttonSecondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button type="button" className={vault.buttonSecondary} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </nav>
          )}
        </>
      )}
      <ConfirmDialog request={request} onClose={() => setRequest(null)} />
    </section>
  );
}

/* ---------- Activity log ---------- */

const ACTION_LABEL: Record<Activity["action"], string> = { suspend: "Suspended", unsuspend: "Unsuspended", delete: "Deleted" };

function ActivityPanel() {
  const { supabase } = useAccount();
  const [rows, setRows] = useState<Activity[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    supabase.rpc("admin_activity", { max_rows: 100 }).then(({ data, error }) => (error ? setError(true) : setRows((data ?? []) as Activity[])));
  }, [supabase]);

  useEffect(load, [load]);

  return (
    <section aria-labelledby="activity-title" className={styles.panel}>
      <h2 id="activity-title" className={styles.sectionTitle}>
        Activity log
      </h2>
      <p className={vault.muted}>Every suspension, unsuspension and deletion made from this admin area, newest first.</p>
      {error ? (
        <ErrorNote text="We couldn't load the activity log." onRetry={load} />
      ) : !rows ? (
        <p className={vault.loading} aria-busy="true">Loading…</p>
      ) : rows.length === 0 ? (
        <p className={inv.noResults}>No admin actions yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">Admin actions, newest first</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Action</th>
                <th scope="col">Account</th>
                <th scope="col">By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.at}-${i}`}>
                  <td data-label="When">{dateTime(r.at)}</td>
                  <td data-label="Action">{ACTION_LABEL[r.action]}</td>
                  <th scope="row" className={styles.email} data-label="Account">
                    {r.target_email ?? "–"}
                  </th>
                  <td data-label="By">{r.admin_email ?? "Former admin"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
