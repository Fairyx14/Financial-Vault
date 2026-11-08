"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { formatDay, parseISODate } from "@/lib/vault";
import styles from "./charts.module.css";

export interface ChartSeries {
  id: string;
  label: string;
  values: number[];
  /** Solid for actual values; dashed for a reference line such as the amount invested. */
  style: "solid" | "dashed";
}

interface StepLineChartProps {
  /** One YYYY-MM-DD date per point, oldest first. */
  dates: string[];
  series: ChartSeries[];
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  /** Describes the chart for screen readers. */
  summary: string;
  /** Optional extra tooltip line for a point, e.g. "1 price carried forward". */
  pointNote?: (index: number) => string | undefined;
  emptyMessage: ReactNode;
}

const HEIGHT = 260;
const MARGIN = { top: 16, right: 16, bottom: 30, left: 60 };

/** Rounds up to a 1, 2, 2.5 or 5 step so axis labels read cleanly. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power;
}

/**
 * Stepped line chart. Values stay flat until the next recorded date, because nothing
 * is known about the market in between. Every recorded point gets a marker.
 */
export default function StepLineChart({ dates, series, formatValue, formatAxis, summary, pointNote, emptyMessage }: StepLineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [dates.length >= 2]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dates.length < 2) return <p className={styles.empty}>{emptyMessage}</p>;

  const times = dates.map((d) => parseISODate(d).getTime());
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (i: number) => MARGIN.left + ((times[i] - t0) / Math.max(t1 - t0, 1)) * innerW;

  const highest = Math.max(...series.flatMap((s) => s.values), 0);
  const step = niceStep(highest / 4);
  const yMax = Math.max(Math.ceil(highest / step) * step, step);
  const y = (v: number) => MARGIN.top + innerH * (1 - Math.max(v, 0) / yMax);
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  // Up to five date labels, spaced evenly in time.
  const spanDays = (t1 - t0) / 86_400_000;
  const tickFormat = new Intl.DateTimeFormat(
    "en-GB",
    spanDays <= 90 ? { day: "numeric", month: "short" } : spanDays <= 730 ? { month: "short", year: "2-digit" } : { year: "numeric" },
  );
  const tickCount = Math.max(2, Math.min(5, Math.floor(innerW / 90)));
  const xTicks = Array.from({ length: tickCount }, (_, i) => t0 + ((t1 - t0) * i) / (tickCount - 1));
  const xAt = (t: number) => MARGIN.left + ((t - t0) / Math.max(t1 - t0, 1)) * innerW;

  const stepPath = (values: number[]) =>
    values.map((v, i) => (i === 0 ? `M${x(0)},${y(v)}` : `H${x(i)}V${y(v)}`)).join("");
  const baseline = y(0);

  const nearest = (px: number) => {
    let best = 0;
    for (let i = 1; i < dates.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    return best;
  };
  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    setActive(nearest(event.clientX - box.left));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive((current) => Math.min(Math.max((current ?? dates.length - 1) + moves[event.key], 0), dates.length - 1));
  };

  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active) + 14, 8), width - 200);
  const note = active === null ? undefined : pointNote?.(active);

  return (
    <div className={styles.chart}>
      <div className={styles.chartTop}>
        <ul className={styles.legend} aria-hidden="true">
          {series.map((s) => (
            <li key={s.id}>
              <span className={`${styles.lineKey} ${s.style === "dashed" ? styles.lineKeyDashed : ""}`} />
              {s.label}
            </li>
          ))}
        </ul>
        <button type="button" className={styles.tableToggle} onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
          {showTable ? "Hide table" : "Show as table"}
        </button>
      </div>

      <div
        ref={wrapRef}
        className={styles.plot}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use the left and right arrow keys to step through recorded dates.`}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((current) => current ?? dates.length - 1)}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} className={styles.svg} aria-hidden="true">
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className={styles.grid} />
              <text x={MARGIN.left - 10} y={y(tick)} textAnchor="end" dominantBaseline="middle" className={styles.axis}>
                {formatAxis(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text
              key={t}
              x={xAt(t)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              className={styles.axis}
            >
              {tickFormat.format(new Date(t))}
            </text>
          ))}

          {series.map((s) =>
            s.style === "solid" ? (
              <path key={`${s.id}-area`} d={`${stepPath(s.values)}V${baseline}H${x(0)}Z`} className={styles.area} />
            ) : null,
          )}
          {series.map((s) => (
            <path key={s.id} d={stepPath(s.values)} className={s.style === "dashed" ? styles.lineDashed : styles.line} />
          ))}
          {series.map((s) =>
            s.values.map((v, i) => (
              <circle
                key={`${s.id}-${i}`}
                cx={x(i)}
                cy={y(v)}
                r={active === i ? 5.5 : 4}
                className={s.style === "dashed" ? styles.dotDashed : styles.dot}
              />
            )),
          )}

          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={baseline} className={styles.crosshair} />
          )}
          <rect
            x={MARGIN.left - 8}
            y={0}
            width={innerW + 16}
            height={HEIGHT}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {active !== null && (
          <div className={styles.tooltip} style={{ left: tooltipLeft, top: MARGIN.top }} aria-live="polite">
            <p className={styles.tooltipDate}>{formatDay(dates[active])}</p>
            {series.map((s) => (
              <p key={s.id} className={styles.tooltipRow}>
                <span className={`${styles.lineKey} ${s.style === "dashed" ? styles.lineKeyDashed : ""}`} aria-hidden="true" />
                <strong>{formatValue(s.values[active])}</strong> {s.label.toLowerCase()}
              </p>
            ))}
            {note && <p className={styles.tooltipNote}>{note}</p>}
          </div>
        )}
      </div>

      {showTable && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">{summary}</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                {series.map((s) => (
                  <th key={s.id} scope="col" className={styles.num}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date, i) => (
                <tr key={date}>
                  <th scope="row">{formatDay(date)}</th>
                  {series.map((s) => (
                    <td key={s.id} className={styles.num}>
                      {formatValue(s.values[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
