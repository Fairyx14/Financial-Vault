"use client";

import { useMemo } from "react";
import Icon from "@/components/Icon";
import { Decimal } from "@/lib/decimal";
import {
  billPaymentsBetween,
  billTypeOf,
  budgetOverview,
  categoryName,
  monthlyTrend,
  monthRange,
  savingsPlan,
  summarizeMonth,
  unconfirmedBills,
  upcomingPayments,
  type BudgetData,
} from "@/lib/budget";
import { formatDay } from "@/lib/vault";
import { money, signedMoney } from "../investments/format";
import MonthPicker, { monthLabel } from "./MonthPicker";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import styles from "./budget.module.css";

interface BudgetDashboardProps {
  data: BudgetData;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
}

const shortMonth = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(new Date(`${month}-01T12:00:00`));

export default function BudgetDashboard({ data, month, today, onMonthChange }: BudgetDashboardProps) {
  const summary = useMemo(() => summarizeMonth(data, month, today), [data, month, today]);
  const trend = useMemo(() => monthlyTrend(data, month, 6, today), [data, month, today]);
  const upcoming = useMemo(() => upcomingPayments(data, today, 30), [data, today]);
  const budgets = useMemo(() => budgetOverview(data, month, today), [data, month, today]);
  const savings = useMemo(() => savingsPlan(data, month, today), [data, month, today]);
  const unconfirmed = useMemo(() => unconfirmedBills(data, today), [data, today]);
  const billsThisMonth = useMemo(() => {
    const { from, to } = monthRange(month);
    return Decimal.sum(billPaymentsBetween(data, from, to, today).map((p) => p.amount));
  }, [data, month, today]);
  const overBudget = budgets.lines.filter((l) => l.status === "over").length;
  const billType = (recordId: string) => billTypeOf(data.expenses.find((r) => r.id === recordId)?.billType ?? "");
  const empty = data.incomes.length === 0 && data.expenses.length === 0;
  const isCurrent = month === today.slice(0, 7);
  const hasExpected = summary.expectedIncome.isPositive() || summary.expectedSpending.isPositive();
  const remainingDir = summary.remaining.isNegative() ? "negative" : summary.remaining.isPositive() ? "positive" : "neutral";

  const trendMax = trend.reduce((max, m) => {
    const top = m.income.compare(m.spending) > 0 ? m.income : m.spending;
    return top.compare(max) > 0 ? top : max;
  }, Decimal.ZERO);
  const barWidth = (amount: Decimal) => (trendMax.isPositive() && amount.isPositive() ? `${Math.max(amount.dividedBy(trendMax).toNumber() * 100, 1)}%` : "0%");

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            {monthLabel(month)}
          </h2>
          <p className={vault.viewSubtitle}>Your income, spending and what&rsquo;s left, from the records you&rsquo;ve entered.</p>
        </div>
        <div className={styles.toolbarRight}>
          <MonthPicker month={month} onChange={onMonthChange} />
          <a href="#/income/new" className={vault.buttonSecondary}>
            <Icon paths={["M12 5v14", "M5 12h14"]} size={16} />
            Income
          </a>
          <a href="#/expenses/new" className={vault.buttonPrimary}>
            <Icon paths={["M12 5v14", "M5 12h14"]} size={16} />
            Expense
          </a>
        </div>
      </div>

      {empty ? (
        <div className={vault.emptyState}>
          <span className={vault.emptyIcon}>
            <Icon paths={["M3 7a2 2 0 0 1 2-2h13v4", "M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2Z", "M16 14.5h.01"]} size={28} />
          </span>
          <h3 className={vault.emptyTitle}>Give every pound a purpose</h3>
          <p className={vault.emptyText}>
            Add your income and a few expenses. Recurring ones like salary or rent only need adding once.
          </p>
          <div className={styles.emptyActions}>
            <a href="#/income/new" className={vault.buttonPrimary}>
              Add income
            </a>
            <a href="#/expenses/new" className={vault.buttonSecondary}>
              Add an expense
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className={inv.overview}>
            <div className={inv.valueCard}>
              <p className={inv.valueLabel}>Left this month</p>
              <p className={inv.valueAmount}>{signedMoney(summary.remaining)}</p>
              <span className={`${inv.gain} ${inv[remainingDir]}`}>
                <span className={inv.gainMain}>
                  {summary.savingsRatePct
                    ? `${summary.savingsRatePct.toFixed(1)}% savings rate`
                    : "No income recorded this month"}
                </span>
              </span>
              <p className={inv.valueNote}>
                {summary.remaining.isNegative()
                  ? "You spent more than you earned this month."
                  : "Net income minus spending."}{" "}
                Savings rate = what&rsquo;s left ÷ net income.
              </p>
              <p className={inv.valueNote}>
                <a href="#/savings" className={styles.valueLink}>
                  {savings.allocations.length === 0
                    ? "Plan some of it for a savings goal"
                    : `${money(savings.planned)} planned and ${money(savings.completed)} deposited to savings goals`}
                </a>
              </p>
            </div>

            <dl className={inv.tiles}>
              <div className={inv.tile}>
                <dt>Income</dt>
                <dd className={inv.positive}>{money(summary.income)}</dd>
                <dd className={inv.tileNote}>Net, after deductions</dd>
              </div>
              <div className={inv.tile}>
                <dt>Spending</dt>
                <dd>{money(summary.spending)}</dd>
                <dd className={inv.tileNote}>Expenses minus refunds</dd>
              </div>
              <div className={inv.tile}>
                <dt>Savings rate</dt>
                <dd className={summary.savingsRatePct?.isNegative() ? inv.negative : undefined}>
                  {summary.savingsRatePct ? `${summary.savingsRatePct.toFixed(1)}%` : "–"}
                </dd>
                <dd className={inv.tileNote}>Of net income kept</dd>
              </div>
              <div className={inv.tile}>
                <dt>Budget used</dt>
                {budgets.usedPct ? (
                  <>
                    <dd className={budgets.usedPct.compare(Decimal.HUNDRED) > 0 ? inv.negative : undefined}>{budgets.usedPct.toFixed(0)}%</dd>
                    <dd className={inv.tileNote}>
                      Of {money(budgets.allocated)} budgeted
                      {overBudget > 0 && ` · ${overBudget} over`}
                    </dd>
                  </>
                ) : (
                  <>
                    <dd>–</dd>
                    <dd className={inv.tileNote}>
                      <a href="#/budgets" className={styles.dashLink}>
                        Set budgets
                      </a>
                    </dd>
                  </>
                )}
              </div>
              <div className={inv.tile}>
                <dt>Bills</dt>
                <dd>{money(billsThisMonth)}</dd>
                <dd className={inv.tileNote}>Bills &amp; subscriptions this month</dd>
              </div>
              <div className={inv.tile}>
                <dt>Transfers</dt>
                <dd>{money(summary.transfers)}</dd>
                <dd className={inv.tileNote}>Between your accounts · not counted</dd>
              </div>
            </dl>

            {hasExpected && (
              <p className={inv.fxNote}>
                <strong>{isCurrent ? "Still to come this month:" : "Not yet happened:"}</strong>{" "}
                {money(summary.expectedIncome)} income and {money(summary.expectedSpending)} spending are dated after today
                and are included as expected.
              </p>
            )}
          </div>

          <div className={styles.dashGrid}>
            <section className={vault.card} aria-labelledby="cat-title">
              <h3 id="cat-title" className={vault.cardTitle}>
                Largest spending
              </h3>
              {summary.categories.length === 0 ? (
                <p className={vault.muted}>No spending recorded in {monthLabel(month)}.</p>
              ) : (
                <ol className={styles.catList}>
                  {summary.categories.slice(0, 6).map((c) => (
                    <li key={c.category}>
                      <div className={styles.catRow}>
                        <span className={styles.catName}>{categoryName(c.category, data.customCategories)}</span>
                        <span className={styles.catAmount}>{money(c.amount)}</span>
                        <span className={styles.catPct}>{c.pct.toFixed(0)}%</span>
                      </div>
                      <span className={styles.catBar} aria-hidden="true">
                        <span style={{ width: `${c.pct.toNumber()}%` }} />
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className={vault.card} aria-labelledby="upcoming-title">
              <div className={vault.cardHead}>
                <h3 id="upcoming-title" className={vault.cardTitle}>
                  Upcoming bills
                </h3>
                <a href="#/bills" className={styles.dashLink}>
                  All bills
                </a>
              </div>
              <p className={vault.muted}>Bills, subscriptions and other recurring payments due in the next 30 days.</p>
              {unconfirmed.length > 0 && (
                <p className={styles.dashAlert}>
                  <a href="#/bills" className={styles.dashLink}>
                    {unconfirmed.length === 1 ? "1 past payment" : `${unconfirmed.length} past payments`} not marked as paid
                  </a>
                </p>
              )}
              {upcoming.length === 0 ? (
                <p className={vault.muted}>Nothing recurring is due. Add rent, bills or subscriptions to see them here.</p>
              ) : (
                <ul className={styles.upcomingList}>
                  {upcoming.slice(0, 8).map((u) => {
                    const type = billType(u.recordId);
                    return (
                      <li key={u.key}>
                        <span className={styles.upcomingDate}>{u.date === today ? "Today" : formatDay(u.date)}</span>
                        <span className={styles.upcomingName}>
                          {u.label}
                          <span className={styles.upcomingCat}>{type ? type.label : categoryName(u.category, data.customCategories)}</span>
                        </span>
                        <span className={styles.upcomingAmount}>{money(u.amount)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <section className={vault.card} aria-labelledby="trend-title">
            <div className={vault.cardHead}>
              <h3 id="trend-title" className={vault.cardTitle}>
                Cash flow, last 6 months
              </h3>
              <ul className={styles.legend} aria-hidden="true">
                <li>
                  <span className={`${styles.legendKey} ${styles.keyIncome}`} />
                  Income
                </li>
                <li>
                  <span className={`${styles.legendKey} ${styles.keySpending}`} />
                  Spending
                </li>
              </ul>
            </div>
            <ul className={styles.trendList}>
              {trend.map((m) => (
                <li key={m.month} className={m.month === month ? styles.trendCurrent : undefined}>
                  <button type="button" className={styles.trendMonth} onClick={() => onMonthChange(m.month)} aria-label={`Show ${monthLabel(m.month)}`}>
                    {shortMonth(m.month)}
                  </button>
                  <div className={styles.trendBars}>
                    <span className={styles.trendLine}>
                      <span className={`${styles.trendBar} ${styles.barIncome}`} style={{ width: barWidth(m.income) }} aria-hidden="true" />
                      <span className={styles.trendValue}>
                        <span className="visually-hidden">Income </span>
                        {money(m.income)}
                      </span>
                    </span>
                    <span className={styles.trendLine}>
                      <span className={`${styles.trendBar} ${styles.barSpending}`} style={{ width: barWidth(m.spending) }} aria-hidden="true" />
                      <span className={styles.trendValue}>
                        <span className="visually-hidden">Spending </span>
                        {money(m.spending)}
                      </span>
                    </span>
                  </div>
                  <span className={`${styles.trendNet} ${m.remaining.isNegative() ? inv.negative : m.remaining.isPositive() ? inv.positive : inv.neutral}`}>
                    <span className="visually-hidden">Left over </span>
                    {signedMoney(m.remaining)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  );
}
