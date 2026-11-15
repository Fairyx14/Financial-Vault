"use client";

/**
 * Budget Vault charts. Hand-built SVG like the Investment Vault's charts (no chart library),
 * reusing the same chart styles. Every chart can be read with the keyboard and has a
 * "Show as table" view with the exact figures.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { categoryName, type BreakdownSlice, type CustomCategory } from "@/lib/budget";
import { Decimal } from "@/lib/decimal";
import { money } from "../investments/format";
import { monthLabel } from "./MonthPicker";
import charts from "../investments/charts.module.css";
import styles from "./budget.module.css";

const HEIGHT = 240;
const MARGIN = { top: 16, right: 12, bottom: 30, left: 64 };

const shortMonth = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(new Date(`${month}-01T12:00:00`));

/** "£1.2k"-style axis labels. */
export const axisMoney = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1000) return `${sign}£${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
  return `${sign}£${abs.toFixed(0)}`;
};

/** Rounds up to a 1, 2, 2.5 or 5 step so axis labels read cleanly. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power;
}

/** A y scale that always includes zero, so negative months sit below the line. */
function scale(values: number[]) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const step = niceStep((hi - lo) / 4 || 1);
  const min = Math.floor(lo / step) * step;
  const max = Math.max(Math.ceil(hi / step) * step, min + step);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const y = (v: number) => MARGIN.top + innerH * (1 - (v - min) / (max - min));
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  return { y, ticks };
}

function useWidth(ready = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ready]);
  return { ref, width };
}

/** Arrow keys step through months; Home/End jump to the ends. */
function useActiveIndex(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive((current) => Math.min(Math.max((current ?? count - 1) + moves[event.key], 0), count - 1));
  };
  return { active, setActive, onKeyDown };
}

function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: { key: string; cells: ReactNode[] }[] }) {
  return (
    <div className={charts.tableWrap}>
      <table className={charts.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={i > 0 ? charts.num : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              {r.cells.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {c}
                  </th>
                ) : (
                  <td key={i} className={charts.num}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={charts.tableToggle} onClick={onToggle} aria-expanded={shown}>
      {shown ? "Hide table" : "Show as table"}
    </button>
  );
}

/* ---------- Expense breakdown doughnut ---------- */

const SIZE = 220;
const STROKE = 30;
const RADIUS = (SIZE - STROKE) / 2;
const GAP = 0.8;

/** Slices use colour slots in size order; "Other" is always neutral. */
const sliceColor = (index: number, category: string) => (category === "other" ? "var(--chart-plan)" : `var(--cat-${index + 1})`);

export function SpendingDonut({ slices, custom, total }: { slices: BreakdownSlice[]; custom: CustomCategory[]; total: Decimal }) {
  const [active, setActive] = useState<string | null>(null);
  const label = (c: string) => (c === "other" ? "Other categories" : categoryName(c, custom));
  const current = slices.find((s) => s.category === active);

  let start = 0;
  const arcs = slices.map((slice, index) => {
    const pct = slice.pct.toNumber();
    const length = Math.max(pct - (slices.length > 1 ? GAP : 0), 0.2);
    const arc = { slice, index, start, length };
    start += pct;
    return arc;
  });

  return (
    <div className={charts.allocationBody}>
      <div className={charts.donutWrap}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={charts.donut} aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} className={charts.donutTrack} strokeWidth={STROKE} />
          {arcs.map(({ slice, index, start: offset, length }) => (
            <circle
              key={slice.category}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              pathLength={100}
              fill="none"
              stroke={sliceColor(index, slice.category)}
              strokeWidth={active === slice.category ? STROKE + 6 : STROKE}
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={-offset}
              className={`${charts.donutSlice} ${active && active !== slice.category ? charts.donutDim : ""}`}
              onPointerEnter={() => setActive(slice.category)}
              onPointerLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className={charts.donutCenter} aria-hidden="true">
          <span className={charts.donutLabel}>{current ? label(current.category) : "Spending"}</span>
          <span className={charts.donutValue}>{current ? `${current.pct.toFixed(1)}%` : money(total)}</span>
          {current && <span className={charts.donutSub}>{money(current.amount)}</span>}
        </div>
      </div>
      {/* The legend is also the data table: every slice's amount and share is always visible. */}
      <ul className={charts.allocLegend} aria-label="Spending by category">
        {slices.map((slice, index) => (
          <li key={slice.category}>
            <button
              type="button"
              className={`${charts.allocItem} ${active === slice.category ? charts.allocItemActive : ""}`}
              onPointerEnter={() => setActive(slice.category)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(slice.category)}
              onBlur={() => setActive(null)}
              aria-label={`${label(slice.category)}: ${slice.pct.toFixed(1)} percent, ${money(slice.amount)}`}
            >
              <span className={charts.swatch} style={{ background: sliceColor(index, slice.category) }} aria-hidden="true" />
              <span className={charts.allocName}>{label(slice.category)}</span>
              <span className={charts.allocPct}>{slice.pct.toFixed(1)}%</span>
              <span className={charts.allocAmount}>{money(slice.amount)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Income versus expenses bars ---------- */

interface BarsProps {
  months: string[];
  income: Decimal[];
  spending: Decimal[];
  selected: string;
  onSelect: (month: string) => void;
}

export function IncomeExpenseBars({ months, income, spending, selected, onSelect }: BarsProps) {
  const { ref, width } = useWidth();
  const { active, setActive, onKeyDown } = useActiveIndex(months.length);
  const [showTable, setShowTable] = useState(false);
  const inc = income.map((v) => v.toNumber());
  const out = spending.map((v) => v.toNumber());
  const { y, ticks } = scale([...inc, ...out]);
  const innerW = width - MARGIN.left - MARGIN.right;
  const band = innerW / months.length;
  const barW = Math.min(28, (band - 12) / 2);
  const x0 = (i: number) => MARGIN.left + band * i + band / 2;
  const zero = y(0);
  const rect = (value: number) => ({ y: Math.min(y(value), zero), height: Math.max(Math.abs(y(value) - zero), value === 0 ? 0 : 1) });
  const summary = `Income and spending for each month from ${monthLabel(months[0])} to ${monthLabel(months[months.length - 1])}.`;

  const pick = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const i = Math.floor((event.clientX - box.left - MARGIN.left) / band);
    setActive(i >= 0 && i < months.length ? i : null);
  };
  const tipLeft = active === null ? 0 : Math.min(Math.max(x0(active) + band / 2, 8), width - 200);

  return (
    <div className={charts.chart}>
      <div className={charts.chartTop}>
        <ul className={charts.legend} aria-hidden="true">
          <li>
            <span className={`${styles.legendKey} ${styles.keyIncome}`} />
            Income
          </li>
          <li>
            <span className={`${styles.legendKey} ${styles.keySpending}`} />
            Spending
          </li>
        </ul>
        <TableToggle shown={showTable} onToggle={() => setShowTable((v) => !v)} />
      </div>
      <div
        ref={ref}
        className={charts.plot}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use the left and right arrow keys to step through months, and Enter to open one.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" && active !== null) onSelect(months[active]);
          else onKeyDown(e);
        }}
        onFocus={() => setActive((c) => c ?? months.length - 1)}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} className={charts.svg} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.zeroLine : charts.grid} />
              <text x={MARGIN.left - 10} y={y(t)} textAnchor="end" dominantBaseline="middle" className={charts.axis}>
                {axisMoney(t)}
              </text>
            </g>
          ))}
          {months.map((m, i) => (
            <g key={m}>
              {(active === i || m === selected) && (
                <rect x={MARGIN.left + band * i + 2} y={MARGIN.top} width={band - 4} height={HEIGHT - MARGIN.top - MARGIN.bottom} className={styles.barHighlight} />
              )}
              <rect x={x0(i) - barW - 1} width={barW} {...rect(inc[i])} className={styles.svgIncome} rx={3} />
              <rect x={x0(i) + 1} width={barW} {...rect(out[i])} className={styles.svgSpending} rx={3} />
              {(months.length <= 8 || i % 2 === (months.length - 1) % 2) && (
                <text x={x0(i)} y={HEIGHT - 8} textAnchor="middle" className={`${charts.axis} ${m === selected ? styles.axisStrong : ""}`}>
                  {shortMonth(m)}
                </text>
              )}
            </g>
          ))}
          <rect
            x={MARGIN.left}
            y={0}
            width={innerW}
            height={HEIGHT}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onPointerMove={pick}
            onPointerLeave={() => setActive(null)}
            onClick={(e) => {
              const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
              const i = Math.floor((e.clientX - box.left - MARGIN.left) / band);
              if (i >= 0 && i < months.length) onSelect(months[i]);
            }}
          />
        </svg>
        {active !== null && (
          <div className={charts.tooltip} style={{ left: tipLeft, top: MARGIN.top }} aria-live="polite">
            <p className={charts.tooltipDate}>{monthLabel(months[active])}</p>
            <p className={charts.tooltipRow}>
              <span className={`${styles.legendKey} ${styles.keyIncome}`} aria-hidden="true" />
              <strong>{money(income[active])}</strong> income
            </p>
            <p className={charts.tooltipRow}>
              <span className={`${styles.legendKey} ${styles.keySpending}`} aria-hidden="true" />
              <strong>{money(spending[active])}</strong> spending
            </p>
          </div>
        )}
      </div>
      {showTable && (
        <ChartTable
          caption={summary}
          head={["Month", "Income", "Spending", "Left over"]}
          rows={months.map((m, i) => ({
            key: m,
            cells: [monthLabel(m), money(income[i]), money(spending[i]), money(income[i].minus(spending[i]))],
          }))}
        />
      )}
    </div>
  );
}

/* ---------- Monthly line (cash flow, savings rate) ---------- */

interface LineProps {
  months: string[];
  /** null leaves a gap, e.g. a savings rate in a month with no income. */
  values: (number | null)[];
  label: string;
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  summary: string;
  tone: "primary" | "secondary";
  gapNote?: string;
}

export function MonthLineChart({ months, values, label, formatValue, formatAxis, summary, tone, gapNote }: LineProps) {
  const { ref, width } = useWidth(values.some((v) => v !== null));
  const { active, setActive, onKeyDown } = useActiveIndex(months.length);
  const [showTable, setShowTable] = useState(false);
  const known = values.filter((v): v is number => v !== null);
  const { y, ticks } = scale(known);
  const innerW = width - MARGIN.left - MARGIN.right;
  const x = (i: number) => MARGIN.left + (months.length === 1 ? innerW / 2 : (innerW * i) / (months.length - 1));
  const lineClass = tone === "primary" ? styles.chartLinePrimary : styles.chartLineSecondary;
  const dotClass = tone === "primary" ? styles.chartDotPrimary : styles.chartDotSecondary;

  // Break the line wherever a value is missing.
  let path = "";
  values.forEach((v, i) => {
    if (v === null) return;
    path += `${i === 0 || values[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`;
  });

  const pick = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = event.clientX - box.left;
    let best = 0;
    for (let i = 1; i < months.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setActive(best);
  };
  const tipLeft = active === null ? 0 : Math.min(Math.max(x(active) + 14, 8), width - 200);

  if (known.length === 0) return <p className={charts.empty}>{gapNote ?? "Nothing to show yet."}</p>;

  return (
    <div className={charts.chart}>
      <div className={charts.chartTop}>
        <ul className={charts.legend} aria-hidden="true">
          <li>
            <span className={`${charts.lineKey} ${tone === "secondary" ? styles.lineKeySecondary : ""}`} />
            {label}
          </li>
        </ul>
        <TableToggle shown={showTable} onToggle={() => setShowTable((v) => !v)} />
      </div>
      <div
        ref={ref}
        className={charts.plot}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use the left and right arrow keys to step through months.`}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((c) => c ?? months.length - 1)}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} className={charts.svg} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.zeroLine : charts.grid} />
              <text x={MARGIN.left - 10} y={y(t)} textAnchor="end" dominantBaseline="middle" className={charts.axis}>
                {formatAxis(t)}
              </text>
            </g>
          ))}
          {months.map((m, i) =>
            months.length <= 8 || i % 2 === (months.length - 1) % 2 ? (
              <text
                key={m}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor={i === 0 && months.length > 1 ? "start" : i === months.length - 1 && months.length > 1 ? "end" : "middle"}
                className={charts.axis}
              >
                {shortMonth(m)}
              </text>
            ) : null,
          )}
          <path d={path} className={lineClass} />
          {values.map((v, i) =>
            v === null ? null : <circle key={months[i]} cx={x(i)} cy={y(v)} r={active === i ? 5.5 : 4} className={dotClass} />,
          )}
          {active !== null && <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} className={charts.crosshair} />}
          <rect x={MARGIN.left - 8} y={0} width={innerW + 16} height={HEIGHT} fill="transparent" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setActive(null)} />
        </svg>
        {active !== null && (
          <div className={charts.tooltip} style={{ left: tipLeft, top: MARGIN.top }} aria-live="polite">
            <p className={charts.tooltipDate}>{monthLabel(months[active])}</p>
            <p className={charts.tooltipRow}>
              <strong>{values[active] === null ? "No income" : formatValue(values[active]!)}</strong> {values[active] === null ? "" : label.toLowerCase()}
            </p>
          </div>
        )}
      </div>
      {gapNote && values.some((v) => v === null) && <p className={charts.chartNote}>{gapNote}</p>}
      {showTable && (
        <ChartTable
          caption={summary}
          head={["Month", label]}
          rows={months.map((m, i) => ({ key: m, cells: [monthLabel(m), values[i] === null ? "–" : formatValue(values[i]!)] }))}
        />
      )}
    </div>
  );
}
