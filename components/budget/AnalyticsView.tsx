"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Decimal } from "@/lib/decimal";
import {
  categoryComparison,
  categoryName,
  monthlyTrend,
  shiftMonth,
  spendingBreakdown,
  summarizeMonth,
  type BudgetData,
} from "@/lib/budget";
import { money, signedMoney } from "../investments/format";
import { axisMoney, IncomeExpenseBars, MonthLineChart, SpendingDonut } from "./BudgetCharts";
import MonthPicker, { monthLabel } from "./MonthPicker";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import charts from "../investments/charts.module.css";
import styles from "./budget.module.css";

interface AnalyticsViewProps {
  data: BudgetData;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
}

/** Months used for "average" comparisons. */
const AVERAGE_MONTHS = 3;


export default function AnalyticsView({ data, month, today, onMonthChange }: AnalyticsViewProps) {
  const [range, setRange] = useState(6);
  const summary = useMemo(() => summarizeMonth(data, month, today), [data, month, today]);
  const trend = useMemo(() => monthlyTrend(data, month, range, today), [data, month, range, today]);
  const comparison = useMemo(() => categoryComparison(data, month, AVERAGE_MONTHS, today), [data, month, today]);
  const previous = useMemo(() => summarizeMonth(data, shiftMonth(month, -1), today), [data, month, today]);
  const slices = spendingBreakdown(summary.categories);
  const months = trend.map((m) => m.month);
  const empty = data.incomes.length === 0 && data.expenses.length === 0;

  const averageSpending = Decimal.sum(comparison.map((c) => c.average));
  const versusLast = summary.spending.minus(previous.spending);
  const versusAverage = summary.spending.minus(averageSpending);
  const rises = comparison.filter((c) => c.change.isPositive()).sort((a, b) => b.change.compare(a.change));
  const falls = comparison.filter((c) => c.change.isNegative()).sort((a, b) => a.change.compare(b.change));
  const rated = trend.filter((m) => m.savingsRatePct !== null);
  const averageRate = rated.length ? Decimal.sum(rated.map((m) => m.savingsRatePct!)).dividedBy(Decimal.of(rated.length)) : null;
  const name = (id: string) => categoryName(id, data.customCategories);

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            Analytics
          </h2>
          <p className={vault.viewSubtitle}>Where your money goes, and how it changes month to month.</p>
        </div>
        <div className={styles.toolbarRight}>
          <MonthPicker month={month} onChange={onMonthChange} />
          <label className={inv.selectField}>
            <span className={inv.selectLabel}>Show</span>
            <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </label>
        </div>
      </div>

      {empty ? (
        <div className={vault.emptyState}>
          <span className={vault.emptyIcon}>
            <Icon paths={["M4 20h16", "M6 16V10", "M10 16V6", "M14 16v-4", "M18 16V8"]} size={28} />
          </span>
          <h3 className={vault.emptyTitle}>Charts appear once you add some records</h3>
          <p className={vault.emptyText}>Add your income and a few expenses to see your spending breakdown and trends.</p>
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
          <div className={styles.dashGrid}>
            <section className={vault.card} aria-labelledby="breakdown-title">
              <h3 id="breakdown-title" className={vault.cardTitle}>
                Expense breakdown · {monthLabel(month)}
              </h3>
              {slices.length === 0 ? (
                <p className={charts.empty}>No spending recorded in {monthLabel(month)}.</p>
              ) : (
                <SpendingDonut slices={slices} custom={data.customCategories} total={summary.spending} />
              )}
            </section>

            <section className={vault.card} aria-labelledby="trends-title">
              <h3 id="trends-title" className={vault.cardTitle}>
                Spending trends
              </h3>
              <dl className={styles.trendStats}>
                <div>
                  <dt>Spent in {monthLabel(month)}</dt>
                  <dd>{money(summary.spending)}</dd>
                </div>
                <div>
                  <dt>Compared with {monthLabel(shiftMonth(month, -1))}</dt>
                  <dd className={versusLast.isPositive() ? inv.negative : versusLast.isNegative() ? inv.positive : undefined}>
                    {changeText(versusLast)}
                  </dd>
                </div>
                <div>
                  <dt>Compared with the {AVERAGE_MONTHS}-month average ({money(averageSpending)})</dt>
                  <dd className={versusAverage.isPositive() ? inv.negative : versusAverage.isNegative() ? inv.positive : undefined}>
                    {changeText(versusAverage)}
                  </dd>
                </div>
                <div>
                  <dt>Biggest rise</dt>
                  <dd>{rises[0] ? `${name(rises[0].category)}, up ${money(rises[0].change)}` : "None"}</dd>
                </div>
                <div>
                  <dt>Biggest fall</dt>
                  <dd>{falls[0] ? `${name(falls[0].category)}, down ${money(falls[0].change.abs())}` : "None"}</dd>
                </div>
                <div>
                  <dt>Average savings rate, last {range} months</dt>
                  <dd>{averageRate ? `${averageRate.toFixed(1)}%` : "–"}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className={vault.card} aria-labelledby="bars-title">
            <h3 id="bars-title" className={vault.cardTitle}>
              Income versus spending
            </h3>
            <p className={vault.muted}>Select a month to look at it in detail.</p>
            <IncomeExpenseBars
              months={months}
              income={trend.map((m) => m.income)}
              spending={trend.map((m) => m.spending)}
              selected={month}
              onSelect={onMonthChange}
            />
          </section>

          <div className={styles.dashGrid}>
            <section className={vault.card} aria-labelledby="flow-title">
              <h3 id="flow-title" className={vault.cardTitle}>
                Monthly cash flow
              </h3>
              <p className={vault.muted}>What was left each month: net income minus spending.</p>
              <MonthLineChart
                months={months}
                values={trend.map((m) => m.remaining.toNumber())}
                label="Left over"
                formatValue={(v) => signedMoney(Decimal.of(v.toFixed(2)))}
                formatAxis={axisMoney}
                summary={`Money left over each month from ${monthLabel(months[0])} to ${monthLabel(month)}.`}
                tone="primary"
              />
            </section>

            <section className={vault.card} aria-labelledby="rate-title">
              <h3 id="rate-title" className={vault.cardTitle}>
                Savings-rate history
              </h3>
              <p className={vault.muted}>Savings rate = what&rsquo;s left ÷ net income, for each month.</p>
              <MonthLineChart
                months={months}
                values={trend.map((m) => (m.savingsRatePct ? m.savingsRatePct.toNumber() : null))}
                label="Savings rate"
                formatValue={(v) => `${v.toFixed(1)}%`}
                formatAxis={(v) => `${v}%`}
                summary={`Savings rate each month from ${monthLabel(months[0])} to ${monthLabel(month)}.`}
                tone="secondary"
                gapNote="Gaps are months with no income recorded, where a savings rate can't be worked out."
              />
            </section>
          </div>

          <section className={vault.card} aria-labelledby="compare-title">
            <h3 id="compare-title" className={vault.cardTitle}>
              Category comparison
            </h3>
            <p className={vault.muted}>
              {monthLabel(month)} against {monthLabel(shiftMonth(month, -1))} and the average of the {AVERAGE_MONTHS} months
              before.
            </p>
            {comparison.length === 0 ? (
              <p className={charts.empty}>No spending to compare yet.</p>
            ) : (
              <div className={`${charts.tableWrap} ${styles.compareWrap}`}>
                <table className={charts.table}>
                  <caption className="visually-hidden">Spending by category compared with earlier months</caption>
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col" className={charts.num}>
                        {monthLabel(month)}
                      </th>
                      <th scope="col" className={charts.num}>
                        Last month
                      </th>
                      <th scope="col" className={charts.num}>
                        Change
                      </th>
                      <th scope="col" className={charts.num}>
                        {AVERAGE_MONTHS}-month average
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c) => (
                      <tr key={c.category}>
                        <th scope="row">{name(c.category)}</th>
                        <td className={charts.num}>{money(c.current)}</td>
                        <td className={charts.num}>{money(c.previous)}</td>
                        <td className={`${charts.num} ${c.change.isPositive() ? inv.negative : c.change.isNegative() ? inv.positive : ""}`}>
                          {changeText(c.change)}
                        </td>
                        <td className={charts.num}>{money(c.average)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className={styles.helpNote}>
            <strong>How these are worked out:</strong> income is net (after deductions); spending is expenses minus refunds;
            transfers between your accounts aren&rsquo;t counted. Repeating entries count in every month they fall in,
            including payments scheduled for later this month.
          </p>
        </>
      )}
    </section>
  );
}

/** "▲ £60.00 more" / "▼ £20.00 less" / "No change", for spending (more is worse). */
function changeText(change: Decimal) {
  if (change.isZero()) return "No change";
  return change.isPositive() ? `▲ ${money(change)} more` : `▼ ${money(change.abs())} less`;
}

