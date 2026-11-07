import { formatMoney, type CurrencyCode } from "@/lib/plan";
import { formatDay, type Entry } from "@/lib/vault";
import Icon from "./Icon";
import styles from "./Vault.module.css";

interface EntryListProps {
  entries: Entry[];
  currency: CurrencyCode;
  onDelete: (entry: Entry) => void;
}

/** Newest first, with the running balance after each entry. */
export default function EntryList({ entries, currency, onDelete }: EntryListProps) {
  if (entries.length === 0) {
    return <p className={styles.muted}>No deposits yet. Your first one will appear here.</p>;
  }

  // Oldest first to build running balances; entries on the same day keep the order they were added.
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry.date === b.entry.date ? a.index - b.index : a.entry.date < b.entry.date ? -1 : 1));

  let running = 0;
  const rows = ordered.map(({ entry }) => {
    running += entry.amount;
    return { entry, balance: running };
  });
  rows.reverse();

  return (
    <ul className={styles.history}>
      {rows.map(({ entry, balance }) => {
        const deposit = entry.amount >= 0;
        const amount = formatMoney(Math.abs(entry.amount), currency);
        const label = entry.note || (deposit ? "Deposit" : "Withdrawal");
        return (
          <li key={entry.id} className={styles.historyRow}>
            <span className={`${styles.historyIcon} ${deposit ? "" : styles.historyIconOut}`} aria-hidden="true">
              <Icon paths={deposit ? ["M12 19V5", "m5 12 7-7 7 7"] : ["M12 5v14", "m19 12-7 7-7-7"]} size={16} />
            </span>
            <span className={styles.historyMain}>
              <span className={styles.historyNote}>{label}</span>
              <span className={styles.historyDate}>{formatDay(entry.date)}</span>
            </span>
            <span className={styles.historyAmounts}>
              <span className={deposit ? styles.amountIn : styles.amountOut}>
                <span className="visually-hidden">{deposit ? "Deposit of " : "Withdrawal of "}</span>
                <span aria-hidden="true">{deposit ? "+" : "−"}</span>
                {amount}
              </span>
              <span className={styles.historyBalance}>Balance {formatMoney(balance, currency)}</span>
            </span>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => onDelete(entry)}
              aria-label={`Delete ${deposit ? "deposit" : "withdrawal"} of ${amount} on ${formatDay(entry.date)}`}
            >
              <Icon paths={["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} size={16} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
