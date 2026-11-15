"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Decimal } from "@/lib/decimal";
import {
  addDaysISO,
  billTypeOf,
  calendarMonth,
  categoryName,
  monthOf,
  type BudgetData,
  type CalendarDay,
  type CalendarEntry,
} from "@/lib/budget";
import { money } from "../investments/format";
import MonthPicker, { monthLabel } from "./MonthPicker";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import styles from "./budget.module.css";

interface CalendarViewProps {
  data: BudgetData;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const longDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00`));

/** Money in minus money out for a day (transfers excluded). */
const dayNet = (d: CalendarDay) => d.income.minus(d.spending);

/** "£60.00 out", or "£20.00 back" on a day where refunds outweigh spending. */
const outText = (spending: Decimal) => (spending.isNegative() ? `${money(spending.abs())} back` : `${money(spending)} out`);

export default function CalendarView({ data, month, today, onMonthChange }: CalendarViewProps) {
  const weeks = useMemo(() => calendarMonth(data, month, today), [data, month, today]);
  const days = weeks.flat();
  const [picked, setPicked] = useState(today);
  // Keep the selection inside the month being shown.
  const selected = monthOf(picked) === month ? picked : monthOf(today) === month ? today : `${month}-01`;
  const selectedDay = days.find((d) => d.date === selected)!;
  const focusAfterMove = useRef(false);

  useEffect(() => {
    if (!focusAfterMove.current) return;
    focusAfterMove.current = false;
    document.querySelector<HTMLElement>(`[data-date="${selected}"]`)?.focus();
  }, [selected]);

  const choose = (date: string) => {
    setPicked(date);
    if (monthOf(date) !== month) onMonthChange(monthOf(date));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    focusAfterMove.current = true;
    choose(addDaysISO(selected, moves[event.key]));
  };

  const inMonth = days.filter((d) => d.inMonth).flatMap((d) => d.entries);
  const totals = (recorded: boolean) => {
    const list = inMonth.filter((e) => e.recorded === recorded);
    const sum = (types: CalendarEntry["type"][]) => Decimal.sum(list.filter((e) => types.includes(e.type)).map((e) => e.amount));
    return { in: sum(["income"]), out: sum(["expense"]).minus(sum(["refund"])) };
  };
  const recorded = totals(true);
  const scheduled = totals(false);

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            Cash-flow calendar
          </h2>
          <p className={vault.viewSubtitle}>Income, bills and spending, day by day. Select a date to see what&rsquo;s on it.</p>
        </div>
        <div className={styles.toolbarRight}>
          <MonthPicker month={month} onChange={onMonthChange} />
        </div>
      </div>

      <dl className={`${inv.tiles} ${styles.tiles4}`}>
        <div className={inv.tile}>
          <dt>Recorded in</dt>
          <dd className={inv.positive}>{money(recorded.in)}</dd>
          <dd className={inv.tileNote}>Confirmed income</dd>
        </div>
        <div className={inv.tile}>
          <dt>Recorded out</dt>
          <dd>{money(recorded.out)}</dd>
          <dd className={inv.tileNote}>Confirmed spending</dd>
        </div>
        <div className={inv.tile}>
          <dt>Scheduled in</dt>
          <dd className={inv.positive}>{money(scheduled.in)}</dd>
          <dd className={inv.tileNote}>From repeating or future entries</dd>
        </div>
        <div className={inv.tile}>
          <dt>Scheduled out</dt>
          <dd>{money(scheduled.out)}</dd>
          <dd className={inv.tileNote}>Bills and repeating payments</dd>
        </div>
      </dl>

      <ul className={styles.calLegend} aria-label="Key">
        <li>
          <span className={`${styles.calPill} ${styles.pillIncome}`}>Income</span>
        </li>
        <li>
          <span className={`${styles.calPill} ${styles.pillOut}`}>Money out</span>
        </li>
        <li>
          <span className={`${styles.calPill} ${styles.pillNeutral}`}>Recorded</span> solid: a one-off entry you added, or a bill you
          marked paid
        </li>
        <li>
          <span className={`${styles.calPill} ${styles.pillNeutral} ${styles.pillScheduled}`}>Scheduled</span> dashed: worked out from a
          repeating entry, or dated in the future
        </li>
      </ul>

      <div className={styles.calWrap}>
        <table className={styles.calendar}>
          <caption className="visually-hidden">
            {monthLabel(month)}. Use the arrow keys to move between days.
          </caption>
          <thead>
            <tr>
              {WEEKDAYS.map((d, i) => (
                <th key={d} scope="col" abbr={WEEKDAYS_LONG[i]}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].date}>
                {week.map((day) => (
                  <td key={day.date} className={day.inMonth ? undefined : styles.calOutside}>
                    <DayButton day={day} today={today} selected={day.date === selected} data={data} onSelect={choose} onKeyDown={onKeyDown} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DayDetail day={selectedDay} data={data} today={today} />
    </section>
  );
}

function DayButton({
  day,
  today,
  selected,
  data,
  onSelect,
  onKeyDown,
}: {
  day: CalendarDay;
  today: string;
  selected: boolean;
  data: BudgetData;
  onSelect: (date: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const counted = day.entries.filter((e) => e.type !== "transfer");
  const parts = [
    longDay(day.date),
    day.date === today ? "today" : "",
    day.entries.length ? `${day.entries.length} ${day.entries.length === 1 ? "entry" : "entries"}` : "nothing recorded",
    day.income.isPositive() ? `${money(day.income)} in` : "",
    day.spending.isZero() ? "" : outText(day.spending),
  ].filter(Boolean);

  return (
    <button
      type="button"
      data-date={day.date}
      className={`${styles.calDay} ${selected ? styles.calSelected : ""} ${day.date === today ? styles.calToday : ""}`}
      tabIndex={selected ? 0 : -1}
      aria-pressed={selected}
      aria-label={parts.join(", ")}
      onClick={() => onSelect(day.date)}
      onKeyDown={onKeyDown}
    >
      <span className={styles.calNumber} aria-hidden="true">
        {Number(day.date.slice(8))}
      </span>
      <span className={styles.calPills} aria-hidden="true">
        {counted.slice(0, 2).map((e) => (
          <span
            key={e.key}
            className={`${styles.calPill} ${e.type === "income" ? styles.pillIncome : e.type === "refund" ? styles.pillNeutral : styles.pillOut} ${e.recorded ? "" : styles.pillScheduled}`}
            title={e.label}
          >
            {e.label}
          </span>
        ))}
        {counted.length > 2 && <span className={styles.calMore}>+{counted.length - 2} more</span>}
      </span>
      {counted.length > 0 && (
        <span className={`${styles.calNet} ${dayNet(day).isNegative() ? inv.negative : inv.positive}`} aria-hidden="true">
          {dayNet(day).isNegative() ? "−" : "+"}
          {money(dayNet(day).abs()).replace(".00", "")}
        </span>
      )}
      {counted.length > 0 && <span className={styles.calDots} aria-hidden="true" />}
    </button>
  );
}

function DayDetail({ day, data, today }: { day: CalendarDay; data: BudgetData; today: string }) {
  return (
    <section className={vault.card} aria-labelledby="day-title">
      <div className={vault.cardHead}>
        <h3 id="day-title" className={`${vault.cardTitle} ${styles.cardTitleRow}`}>
          {longDay(day.date)}
          {day.date === today && <span className={styles.badge}>Today</span>}
        </h3>
        {day.entries.length > 0 && (
          <span className={styles.cardTotal}>
            {money(day.income)} in · {outText(day.spending)}
          </span>
        )}
      </div>
      {day.entries.length === 0 ? (
        <p className={vault.muted}>Nothing on this day.</p>
      ) : (
        <ul className={styles.dayList}>
          {day.entries.map((e) => {
            const record = e.type === "income" ? undefined : data.expenses.find((r) => r.id === e.recordId);
            const bill = billTypeOf(record?.billType ?? "");
            const href = e.type === "income" ? `#/income/${e.recordId}` : bill ? `#/bills/${e.recordId}` : `#/expenses/${e.recordId}`;
            const sign = e.type === "income" || e.type === "refund" ? "+" : e.type === "transfer" ? "" : "−";
            return (
              <li key={e.key}>
                <span className={styles.entryMain}>
                  <a href={href} className={styles.dayLink}>
                    {e.label}
                  </a>
                  <span className={styles.entryMeta}>
                    {e.type === "income"
                      ? "Income"
                      : e.type === "transfer"
                        ? "Transfer · not counted"
                        : e.type === "refund"
                          ? `Refund · ${categoryName(e.category, data.customCategories)}`
                          : bill
                            ? bill.label
                            : categoryName(e.category, data.customCategories)}
                    <span className={`${styles.statusChip} ${e.recorded ? styles.chip_ok : styles.bill_upcoming}`}>
                      {e.recorded ? "Recorded" : "Scheduled"}
                    </span>
                  </span>
                </span>
                <span className={`${styles.entryAmount} ${sign === "+" ? inv.positive : sign === "" ? inv.neutral : ""}`}>
                  {sign}
                  {money(e.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
