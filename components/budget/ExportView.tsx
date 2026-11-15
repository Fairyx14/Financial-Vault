"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { entriesBetween, periodRange, SEARCH_PERIODS, type BudgetData, type SearchPeriod } from "@/lib/budget";
import { backupJSON, monthlySummaryCSV, transactionsCSV } from "@/lib/budgetExport";
import MonthPicker, { monthLabel } from "./MonthPicker";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import styles from "./budget.module.css";

interface ExportViewProps {
  data: BudgetData;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
  onAnnounce: (text: string) => void;
}

/** Saves text as a file using the browser. Nothing is uploaded. */
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DOWNLOAD = ["M12 4v11", "m7 10 5 5 5-5", "M5 20h14"];

export default function ExportView({ data, month, today, onMonthChange, onAnnounce }: ExportViewProps) {
  const [period, setPeriod] = useState<SearchPeriod>("12");
  const { from, to } = periodRange(data, month, period);
  const count = entriesBetween(data, from, to, today).length;
  const empty = data.incomes.length === 0 && data.expenses.length === 0;
  const range = from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : `${from.slice(0, 7)}-to-${to.slice(0, 7)}`;

  const save = (name: string, text: string, type: string, what: string) => {
    download(name, text, type);
    onAnnounce(`${what} downloaded as ${name}.`);
  };

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            Export your data
          </h2>
          <p className={vault.viewSubtitle}>Download your Budget Vault to keep a copy or open it in a spreadsheet.</p>
        </div>
        <div className={styles.toolbarRight}>
          <MonthPicker month={month} onChange={onMonthChange} />
        </div>
      </div>

      <div className={styles.exportGrid}>
        <section className={vault.card} aria-labelledby="export-tx-title">
          <h3 id="export-tx-title" className={vault.cardTitle}>
            Transactions (CSV)
          </h3>
          <p className={vault.muted}>
            One row per payment, with date, description, category, amount, whether it counts as income, spending, a refund
            or a transfer, and whether it&rsquo;s recorded or scheduled.
          </p>
          <label className={inv.selectField}>
            <span className={inv.selectLabel}>Dates</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as SearchPeriod)}>
              {SEARCH_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === "1" ? monthLabel(month) : p.label}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.exportMeta}>
            {count} {count === 1 ? "row" : "rows"} · {monthLabel(from.slice(0, 7))}
            {from.slice(0, 7) !== to.slice(0, 7) && ` to ${monthLabel(to.slice(0, 7))}`}
          </p>
          <button
            type="button"
            className={vault.buttonPrimary}
            disabled={count === 0}
            onClick={() => save(`dream-vault-transactions-${range}.csv`, transactionsCSV(data, from, to, today), "text/csv;charset=utf-8", "Transactions")}
          >
            <Icon paths={DOWNLOAD} size={16} />
            Download transactions
          </button>
        </section>

        <section className={vault.card} aria-labelledby="export-summary-title">
          <h3 id="export-summary-title" className={vault.cardTitle}>
            Monthly summary (CSV)
          </h3>
          <p className={vault.muted}>
            Net income, spending, what was left, savings rate and transfers for each of the 12 months to {monthLabel(month)}.
          </p>
          <button
            type="button"
            className={vault.buttonSecondary}
            disabled={empty}
            onClick={() => save(`dream-vault-monthly-summary-to-${month}.csv`, monthlySummaryCSV(data, month, 12, today), "text/csv;charset=utf-8", "Monthly summary")}
          >
            <Icon paths={DOWNLOAD} size={16} />
            Download summary
          </button>
        </section>

        <section className={vault.card} aria-labelledby="export-backup-title">
          <h3 id="export-backup-title" className={vault.cardTitle}>
            Full backup (JSON)
          </h3>
          <p className={vault.muted}>
            Everything in your Budget Vault: income, expenses, categories, budgets, bill payments and savings allocations.
            Keep it somewhere safe. Restoring from a backup isn&rsquo;t available in Dream Vault yet.
          </p>
          <button
            type="button"
            className={vault.buttonSecondary}
            onClick={() => save(`dream-vault-budget-backup-${today}.json`, backupJSON(data, new Date().toISOString()), "application/json", "Backup")}
          >
            <Icon paths={DOWNLOAD} size={16} />
            Download backup
          </button>
        </section>
      </div>

      <p className={styles.helpNote}>
        <strong>Your files stay with you.</strong> Downloads are created in your browser and saved to your device. Nothing is
        uploaded or sent anywhere. Anyone who opens the file can read it, so store it as carefully as a bank statement. CSV
        files open in Excel, Numbers and Google Sheets; amounts are in pounds.
      </p>
    </section>
  );
}
