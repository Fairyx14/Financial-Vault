"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Decimal } from "@/lib/decimal";
import {
  billTypeOf,
  categoryName,
  entriesBetween,
  EXPENSE_CATEGORIES,
  frequencyLabel,
  INCOME_CATEGORIES,
  isRecorded,
  PAYMENT_METHODS,
  periodRange,
  SEARCH_PERIODS,
  type BudgetData,
  type BudgetEntry,
  type Frequency,
  type SearchPeriod,
} from "@/lib/budget";
import { formatDay } from "@/lib/vault";
import { money } from "../investments/format";
import MonthPicker, { monthLabel } from "./MonthPicker";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import styles from "./budget.module.css";

type Mode = "income" | "expenses";
type SortKey = "newest" | "oldest" | "largest" | "smallest" | "name";

interface EntryListProps {
  mode: Mode;
  data: BudgetData;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
  onDelete: (recordId: string) => void;
}

const TYPE_LABEL: Record<BudgetEntry["type"], string> = {
  income: "Income",
  expense: "Expense",
  refund: "Refund",
  transfer: "Transfer · not counted",
};

export default function EntryList({ mode, data, month, today, onMonthChange, onDelete }: EntryListProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [period, setPeriod] = useState<SearchPeriod>("1");
  const [status, setStatus] = useState<"all" | "recorded" | "scheduled">("all");
  const [method, setMethod] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const isIncome = mode === "income";
  const { from, to } = periodRange(data, month, period);
  const periodText = period === "1" ? monthLabel(month) : `${SEARCH_PERIODS.find((p) => p.id === period)!.label} to ${monthLabel(month)}`;
  const min = minAmount.trim() ? Decimal.parse(minAmount) : null;
  const max = maxAmount.trim() ? Decimal.parse(maxAmount) : null;
  const minInvalid = minAmount.trim() !== "" && !min;
  const maxInvalid = maxAmount.trim() !== "" && !max;
  const extraFilters = [status !== "all", method !== "all", !!min, !!max].filter(Boolean).length;
  const anyFilter = query.trim() !== "" || category !== "all" || type !== "all" || extraFilters > 0;

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setType("all");
    setStatus("all");
    setMethod("all");
    setMinAmount("");
    setMaxAmount("");
  };

  const all = useMemo(
    () => entriesBetween(data, from, to, today).filter((e) => (isIncome ? e.type === "income" : e.type !== "income")),
    [data, from, to, today, isIncome],
  );

  const frequencyOf = (recordId: string): Frequency =>
    (isIncome ? data.incomes : data.expenses).find((r) => r.id === recordId)?.frequency ?? "once";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const methods = new Map(data.expenses.map((r) => [r.id, r.paymentMethod]));
    const notes = new Map([...data.incomes, ...data.expenses].map((r) => [r.id, r.notes.toLowerCase()]));
    const list = all.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (type !== "all" && e.type !== type) return false;
      if (status !== "all" && isRecorded(e, data, today) !== (status === "recorded")) return false;
      if (method !== "all" && methods.get(e.recordId) !== method) return false;
      if (min && e.amount.compare(min) < 0) return false;
      if (max && e.amount.compare(max) > 0) return false;
      if (!q) return true;
      return (
        e.label.toLowerCase().includes(q) ||
        categoryName(e.category, data.customCategories).toLowerCase().includes(q) ||
        (notes.get(e.recordId) ?? "").includes(q)
      );
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.date.localeCompare(b.date);
        case "largest":
          return b.amount.compare(a.amount);
        case "smallest":
          return a.amount.compare(b.amount);
        case "name":
          return a.label.localeCompare(b.label, "en-GB");
        default:
          return b.date.localeCompare(a.date);
      }
    });
  }, [all, query, category, type, sort, status, method, min?.toString(), max?.toString(), data, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = Decimal.sum(
    visible.filter((e) => e.type !== "transfer").map((e) => (e.type === "refund" ? e.amount.negated() : e.amount)),
  );
  const categoryOptions = isIncome
    ? INCOME_CATEGORIES.map((c) => ({ id: c.id as string, label: c.label }))
    : [...EXPENSE_CATEGORIES.map((c) => ({ id: c.id as string, label: c.label })), ...data.customCategories.map((c) => ({ id: c.id, label: c.name }))];
  const usedCategories = categoryOptions.filter((c) => all.some((e) => e.category === c.id));

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            {isIncome ? "Income" : "Expenses"}
          </h2>
          <p className={vault.viewSubtitle}>
            {periodText} · {isIncome ? "net amounts received" : "expenses, refunds and transfers"}
          </p>
        </div>
        <div className={styles.toolbarRight}>
          <MonthPicker month={month} onChange={onMonthChange} />
          <a href={isIncome ? "#/income/new" : "#/expenses/new"} className={vault.buttonPrimary}>
            <Icon paths={["M12 5v14", "M5 12h14"]} size={16} />
            {isIncome ? "Add income" : "Add expense"}
          </a>
        </div>
      </div>

      <div className={`${inv.filters} ${styles.filtersWide}`}>
        <label className={inv.searchField}>
          <span className="visually-hidden">Search {isIncome ? "income" : "expenses"}</span>
          <Icon paths={["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z", "m20 20-4-4"]} size={18} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search description, category or notes" autoComplete="off" />
        </label>
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
        {isIncome ? (
          <label className={inv.selectField}>
            <span className={inv.selectLabel}>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {usedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className={styles.filterPair}>
            <label className={inv.selectField}>
              <span className={inv.selectLabel}>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">All</option>
                <option value="expense">Expenses</option>
                <option value="refund">Refunds</option>
                <option value="transfer">Transfers</option>
              </select>
            </label>
            <label className={inv.selectField}>
              <span className={inv.selectLabel}>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">All</option>
                {usedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <label className={inv.selectField}>
          <span className={inv.selectLabel}>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="largest">Largest first</option>
            <option value="smallest">Smallest first</option>
            <option value="name">A to Z</option>
          </select>
        </label>
      </div>

      <div className={styles.filterBar}>
        <button
          type="button"
          className={styles.moreToggle}
          aria-expanded={moreOpen}
          aria-controls="more-filters"
          onClick={() => setMoreOpen((v) => !v)}
        >
          {moreOpen ? "Fewer filters" : "More filters"}
          {extraFilters > 0 && <span className={styles.badge}>{extraFilters} on</span>}
        </button>
        {anyFilter && (
          <button type="button" className={styles.moreToggle} onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {moreOpen && (
        <div id="more-filters" className={styles.moreFilters}>
          <label className={inv.selectField}>
            <span className={inv.selectLabel}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">All</option>
              <option value="recorded">Recorded</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>
          {!isIncome && (
            <label className={inv.selectField}>
              <span className={inv.selectLabel}>Paid by</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="all">Any method</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.id || "none"} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={`${inv.selectField} ${styles.amountField} ${minInvalid ? styles.amountInvalid : ""}`}>
            <span className={inv.selectLabel}>From £</span>
            <input inputMode="decimal" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" aria-invalid={minInvalid || undefined} />
          </label>
          <label className={`${inv.selectField} ${styles.amountField} ${maxInvalid ? styles.amountInvalid : ""}`}>
            <span className={inv.selectLabel}>To £</span>
            <input inputMode="decimal" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Any" aria-invalid={maxInvalid || undefined} />
          </label>
          <p className={styles.moreHint}>
            {minInvalid || maxInvalid
              ? "Amounts must be numbers, for example 25 or 42.50."
              : "Recorded: one-off entries up to today and bills marked paid. Scheduled: from repeating entries or dated in the future."}
          </p>
        </div>
      )}

      <p className={styles.listSummary} aria-live="polite">
        {visible.length} {visible.length === 1 ? "entry" : "entries"} ·{" "}
        {isIncome ? (
          <>
            <strong>{money(total)}</strong> received
          </>
        ) : type === "transfer" ? (
          <>
            <strong>{money(Decimal.sum(visible.map((e) => e.amount)))}</strong> moved between your accounts (not counted as spending)
          </>
        ) : (
          <>
            <strong>{money(total)}</strong> spent (refunds taken off, transfers not counted)
          </>
        )}
      </p>

      {visible.length === 0 ? (
        <div className={inv.noResults}>
          {all.length === 0
            ? `Nothing recorded for ${periodText} yet.`
            : "Nothing matches your search or filters."}
        </div>
      ) : (
        <ul className={styles.entryList}>
          {visible.map((e) => {
            const bill = isIncome ? undefined : billTypeOf(data.expenses.find((r) => r.id === e.recordId)?.billType ?? "");
            const freq = frequencyOf(e.recordId);
            const sign = e.type === "income" ? "+" : e.type === "refund" ? "+" : e.type === "transfer" ? "" : "−";
            const recordHref = `#/${isIncome ? "income" : "expenses"}/${e.recordId}`;
            return (
              <li key={e.key} className={`${styles.entry} ${e.type === "transfer" ? styles.entryMuted : ""}`}>
                <span className={styles.entryDate}>
                  <span className={styles.entryDay}>{Number(e.date.slice(8))}</span>
                  <span className={styles.entryMonth}>{formatDay(e.date).split(" ")[1]}</span>
                </span>
                <span className={styles.entryMain}>
                  <span className={styles.entryLabel}>{e.label}</span>
                  <span className={styles.entryMeta}>
                    {e.type === "transfer" ? TYPE_LABEL.transfer : categoryName(e.category, data.customCategories)}
                    {e.type === "refund" && <span className={styles.badgeRefund}>Refund</span>}
                    {freq !== "once" && <span className={styles.badge}>{frequencyLabel(freq)}</span>}
                    {bill && e.type === "expense" && <span className={styles.badge}>{bill.group === "subscription" ? "Subscription" : "Bill"}</span>}
                    {e.expected && <span className={styles.badgeExpected}>Expected</span>}
                  </span>
                </span>
                <span
                  className={`${styles.entryAmount} ${e.type === "income" || e.type === "refund" ? inv.positive : e.type === "transfer" ? inv.neutral : ""}`}
                >
                  {sign}
                  {money(e.amount)}
                </span>
                <span className={styles.entryActions}>
                  <a href={recordHref} className={vault.iconButton} aria-label={`Edit ${e.label}`} title="Edit">
                    <Icon paths={["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"]} size={16} />
                  </a>
                  <button type="button" className={vault.iconButton} onClick={() => onDelete(e.recordId)} aria-label={`Delete ${e.label}`} title="Delete">
                    <Icon paths={["M4 7h16", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} size={16} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {!isIncome && (
        <p className={styles.helpNote}>
          <strong>Paying a credit card?</strong> Record each card purchase as an expense when you make it, then record the
          card bill as a <em>transfer between my accounts</em>, so the same spending isn&rsquo;t counted twice.
        </p>
      )}
    </section>
  );
}
