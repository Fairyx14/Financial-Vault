"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import { Decimal } from "@/lib/decimal";
import {
  budgetOverview,
  categoryName,
  EXPENSE_CATEGORIES,
  NEAR_LIMIT_PCT,
  shiftMonth,
  validateBudgetLimits,
  type BudgetData,
  type BudgetLine,
} from "@/lib/budget";
import { money } from "../investments/format";
import Field from "../investments/Field";
import MonthPicker, { monthLabel } from "./MonthPicker";
import planner from "../DreamVault.module.css";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import styles from "./budget.module.css";

interface BudgetsViewProps {
  data: BudgetData;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
  onSave: (limits: Record<string, string>) => void;
  /** Copy this month's limits into the next `count` months (the parent confirms any replacements). */
  onCopyForward: (count: number) => void;
}

const COPY_CHOICES = [
  { count: 1, label: "Next month" },
  { count: 3, label: "Next 3 months" },
  { count: 6, label: "Next 6 months" },
  { count: 12, label: "Next 12 months" },
];

const STATUS_TEXT: Record<BudgetLine["status"], string> = { ok: "On track", near: "Close to limit", over: "Over budget" };
const STATUS_ICON: Record<BudgetLine["status"], string[]> = {
  ok: ["m5 12.5 4.5 4.5L19 7.5"],
  near: ["M12 8v5", "M12 16.5h.01", "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"],
  over: ["M12 8v5", "M12 16.5h.01", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
};

export default function BudgetsView({ data, month, today, onMonthChange, onSave, onCopyForward }: BudgetsViewProps) {
  const overview = useMemo(() => budgetOverview(data, month, today), [data, month, today]);
  const [editing, setEditing] = useState(false);
  const [copyCount, setCopyCount] = useState(1);
  const previous = shiftMonth(month, -1);
  const previousLimits = data.budgets[previous];
  const hasBudgets = overview.lines.length > 0;
  const name = (id: string) => categoryName(id, data.customCategories);
  const firstRender = useRef(true);

  // Opening or closing the editor swaps the whole view, so move focus to its heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.querySelector<HTMLElement>("[data-view-heading]")?.focus();
  }, [editing]);

  if (editing) {
    return (
      <BudgetEditor
        data={data}
        month={month}
        spentByCategory={
          new Map<string, Decimal>([
            ...overview.lines.map((l) => [l.category, l.spent] as const),
            ...overview.unbudgeted.map((c) => [c.category, c.amount] as const),
          ])
        }
        onCancel={() => setEditing(false)}
        onSave={(limits) => {
          onSave(limits);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            Budgets
          </h2>
          <p className={vault.viewSubtitle}>{monthLabel(month)} · monthly spending limits by category</p>
        </div>
        <div className={styles.toolbarRight}>
          <MonthPicker month={month} onChange={onMonthChange} />
          <button type="button" className={vault.buttonPrimary} onClick={() => setEditing(true)}>
            <Icon paths={hasBudgets ? ["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"] : ["M12 5v14", "M5 12h14"]} size={16} />
            {hasBudgets ? "Edit budgets" : "Set budgets"}
          </button>
        </div>
      </div>

      {!hasBudgets ? (
        <div className={vault.emptyState}>
          <span className={vault.emptyIcon}>
            <Icon paths={["M21 12a9 9 0 1 1-9-9v9h9Z", "M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"]} size={28} />
          </span>
          <h3 className={vault.emptyTitle}>No budgets for {monthLabel(month)}</h3>
          <p className={vault.emptyText}>
            Set a monthly limit for the categories you want to keep an eye on, for example Groceries £300 or Dining £200.
          </p>
          <div className={styles.emptyActions}>
            <button type="button" className={vault.buttonPrimary} onClick={() => setEditing(true)}>
              Set budgets
            </button>
            {previousLimits && (
              <button type="button" className={vault.buttonSecondary} onClick={() => onSave(previousLimits)}>
                Copy from {monthLabel(previous)}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <dl className={`${inv.tiles} ${styles.tiles4}`}>
            <div className={inv.tile}>
              <dt>Budgeted</dt>
              <dd>{money(overview.allocated)}</dd>
              <dd className={inv.tileNote}>
                Across {overview.lines.length} {overview.lines.length === 1 ? "category" : "categories"}
              </dd>
            </div>
            <div className={inv.tile}>
              <dt>Spent</dt>
              <dd>{money(overview.spent)}</dd>
              <dd className={inv.tileNote}>In budgeted categories</dd>
            </div>
            <div className={inv.tile}>
              <dt>{overview.remaining.isNegative() ? "Over" : "Left"}</dt>
              <dd className={overview.remaining.isNegative() ? inv.negative : inv.positive}>{money(overview.remaining.abs())}</dd>
              <dd className={inv.tileNote}>{overview.remaining.isNegative() ? "More than you budgeted" : "Still to spend"}</dd>
            </div>
            <div className={inv.tile}>
              <dt>Budget used</dt>
              <dd className={overview.usedPct && overview.usedPct.compare(Decimal.HUNDRED) > 0 ? inv.negative : undefined}>
                {overview.usedPct?.toFixed(0)}%
              </dd>
              <dd className={inv.tileNote}>Of the total you set</dd>
            </div>
          </dl>

          <ul className={styles.budgetList}>
            {overview.lines.map((line) => {
              const pct = Math.min(line.usedPct.toNumber(), 100);
              return (
                <li key={line.category} className={`${styles.budgetCard} ${styles[`budget_${line.status}`]}`}>
                  <div className={styles.budgetHead}>
                    <h3 className={styles.budgetName}>{name(line.category)}</h3>
                    <span className={`${styles.statusChip} ${styles[`chip_${line.status}`]}`}>
                      <Icon paths={STATUS_ICON[line.status]} size={14} />
                      {line.status === "near" && line.remaining.isZero() ? "Limit reached" : STATUS_TEXT[line.status]}
                    </span>
                  </div>
                  <p className={styles.budgetAmounts}>
                    <strong>{money(line.spent)}</strong> of {money(line.allocated)}
                    <span className={styles.budgetPct}>{line.usedPct.toFixed(0)}% used</span>
                  </p>
                  <span
                    className={styles.budgetBar}
                    role="progressbar"
                    aria-label={`${name(line.category)} budget used`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    aria-valuetext={`${line.usedPct.toFixed(0)}% used`}
                  >
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <p className={`${styles.budgetLeft} ${line.remaining.isNegative() ? inv.negative : ""}`}>
                    {line.remaining.isNegative() ? `${money(line.remaining.abs())} over budget` : `${money(line.remaining)} left`}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className={styles.dashGrid}>
            <section className={vault.card} aria-labelledby="unbudgeted-title">
              <h3 id="unbudgeted-title" className={vault.cardTitle}>
                Spending without a budget
              </h3>
              {overview.unbudgeted.length === 0 ? (
                <p className={vault.muted}>Every category you spent in this month has a budget.</p>
              ) : (
                <>
                  <p className={vault.muted}>
                    {money(overview.unbudgetedTotal)} in {overview.unbudgeted.length}{" "}
                    {overview.unbudgeted.length === 1 ? "category" : "categories"} with no limit set.
                  </p>
                  <ul className={styles.upcomingList}>
                    {overview.unbudgeted.map((c) => (
                      <li key={c.category} className={styles.simpleRow}>
                        <span className={styles.upcomingName}>{name(c.category)}</span>
                        <span className={styles.upcomingAmount}>{money(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className={vault.card} aria-labelledby="copy-title">
              <h3 id="copy-title" className={vault.cardTitle}>
                Use these budgets again
              </h3>
              <p className={vault.muted}>
                Copy {monthLabel(month)}&rsquo;s limits into future months. You&rsquo;ll be asked first if a month already has
                budgets.
              </p>
              <form
                className={styles.copyRow}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  onCopyForward(copyCount);
                }}
              >
                <label htmlFor="copy-count" className="visually-hidden">
                  Copy into
                </label>
                <span className={`${planner.inputWrap} ${planner.selectWrap}`}>
                  <select id="copy-count" className={planner.input} value={copyCount} onChange={(e) => setCopyCount(Number(e.target.value))}>
                    {COPY_CHOICES.map((c) => (
                      <option key={c.count} value={c.count}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </span>
                <button type="submit" className={vault.buttonSecondary}>
                  Copy budgets
                </button>
              </form>
            </section>
          </div>
        </>
      )}

      <p className={styles.helpNote}>
        <strong>How spending is counted:</strong> expenses dated in {monthLabel(month)}, minus refunds, including recurring
        payments scheduled for later in the month. Transfers between your accounts don&rsquo;t count. A budget shows
        &ldquo;Close to limit&rdquo; from {NEAR_LIMIT_PCT}% used.
      </p>
    </section>
  );
}

/* ---------- Editor ---------- */

function BudgetEditor({
  data,
  month,
  spentByCategory,
  onSave,
  onCancel,
}: {
  data: BudgetData;
  month: string;
  spentByCategory: Map<string, Decimal>;
  onSave: (limits: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const categories = [
    ...EXPENSE_CATEGORIES.map((c) => ({ id: c.id as string, label: c.label })),
    ...data.customCategories.map((c) => ({ id: c.id, label: c.name })),
  ];
  const [limits, setLimits] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, data.budgets[month]?.[c.id] ?? ""])),
  );
  const [submitted, setSubmitted] = useState(false);
  const errors = validateBudgetLimits(limits);
  const valid = Object.keys(errors).length === 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSave(limits);
  };

  return (
    <section aria-labelledby="view-title">
      <button type="button" className={`${vault.backLink} ${styles.linkButton}`} onClick={onCancel}>
        ← Budgets
      </button>
      <h2 id="view-title" tabIndex={-1} data-view-heading className={`${vault.viewTitle} ${vault.formTitle}`}>
        Budgets for {monthLabel(month)}
      </h2>
      <form className={`${planner.planner} ${styles.form}`} onSubmit={submit} noValidate aria-labelledby="view-title">
        <p className={planner.hint}>
          Enter a monthly limit for each category you want to track. Leave a box empty for no budget. These limits apply to{" "}
          {monthLabel(month)} only; you can copy them into later months afterwards.
        </p>
        <div className={planner.fieldGrid}>
          {categories.map((c) => {
            const spent = spentByCategory.get(c.id);
            return (
              <Field
                key={c.id}
                id={`budget-${c.id.replace(/[^a-z0-9-]/gi, "")}`}
                label={c.label}
                inputMode="decimal"
                prefix="£"
                value={limits[c.id]}
                onChange={(v) => setLimits((l) => ({ ...l, [c.id]: v }))}
                error={submitted ? errors[c.id] : undefined}
                hint={spent ? `${money(spent)} spent so far` : undefined}
              />
            );
          })}
        </div>
        <div className={vault.formActions}>
          <button type="submit" className={vault.buttonPrimary}>
            Save budgets
          </button>
          <button type="button" className={vault.buttonGhost} onClick={onCancel}>
            Cancel
          </button>
          {submitted && !valid && (
            <p className={vault.formError} role="alert">
              Please fix the highlighted fields.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
