"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatMoneyCompact } from "@/lib/plan";
import styles from "./charts.module.css";

export interface ProjectionSeries {
  id: string;
  label: string;
  /** One value per year, starting at year 0. */
  values: number[];
  color: string;
  dashed?: boolean;
}

interface ProjectionChartProps {
  series: ProjectionSeries[];
  formatValue: (value: number) => string;
  summary: string;
}

const HEIGHT = 300;
const MARGIN = { top: 16, right: 92, bottom: 30, left: 60 };

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power;
}

/** Hypothetical growth by year. Lines end with their own labels so colour is never the only key. */
export default function ProjectionChart({ series, formatValue, summary }: ProjectionChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const years = series[0]?.values.length ?? 0;
  const last = years - 1;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (year: number) => MARGIN.left + (last > 0 ? year / last : 0) * innerW;

  const highest = Math.max(...series.flatMap((s) => s.values), 0);
  const step = niceStep(highest / 4);
  const yMax = Math.max(Math.ceil(highest / step) * step, step);
  const y = (v: number) => MARGIN.top + innerH * (1 - Math.max(v, 0) / yMax);
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const xStep = Math.max(1, Math.ceil(last / Math.max(2, Math.floor(innerW / 70))));
  const xTicks = Array.from({ length: Math.floor(last / xStep) + 1 }, (_, i) => i * xStep);
  // Always label the final year; drop the tick before it if they'd be too close.
  if (xTicks[xTicks.length - 1] !== last) {
    if (last - xTicks[xTicks.length - 1] < xStep / 2) xTicks.pop();
    xTicks.push(last);
  }

  // Spread the end labels so they never overlap.
  const ends = series
    .map((s) => ({ id: s.id, label: s.label, color: s.color, y: y(s.values[last]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = event.clientX - box.left - MARGIN.left;
    setActive(Math.min(Math.max(Math.round((px / innerW) * last), 0), last));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive((current) => Math.min(Math.max((current ?? last) + moves[event.key], 0), last));
  };

  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active) + 14, 8), width - 220);

  return (
    <div className={styles.chart}>
      <ul className={styles.legend} aria-hidden="true">
        {series.map((s) => (
          <li key={s.id}>
            <span className={`${styles.lineKey} ${s.dashed ? styles.lineKeyDashed : ""}`} style={s.dashed ? undefined : { borderTopColor: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div
        ref={wrapRef}
        className={styles.plot}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use the left and right arrow keys to step through the years.`}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((current) => current ?? last)}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} className={styles.svg} aria-hidden="true">
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className={styles.grid} />
              <text x={MARGIN.left - 10} y={y(tick)} textAnchor="end" dominantBaseline="middle" className={styles.axis}>
                {formatMoneyCompact(tick, "GBP")}
              </text>
            </g>
          ))}
          {xTicks.map((year) => (
            <text key={year} x={x(year)} y={HEIGHT - 8} textAnchor="middle" className={styles.axis}>
              {year === 0 ? "Now" : `Yr ${year}`}
            </text>
          ))}
          {series.map((s) => (
            <path
              key={s.id}
              d={s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("")}
              fill="none"
              stroke={s.dashed ? "var(--chart-plan)" : s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "6 5" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {ends.map((end) => (
            <text key={end.id} x={width - MARGIN.right + 8} y={end.y} dominantBaseline="middle" className={styles.endLabel}>
              {end.label}
            </text>
          ))}
          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={y(0)} className={styles.crosshair} />
              {series.map((s) => (
                <circle
                  key={s.id}
                  cx={x(active)}
                  cy={y(s.values[active])}
                  r={4.5}
                  fill={s.dashed ? "var(--chart-plan)" : s.color}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                />
              ))}
            </g>
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
            <p className={styles.tooltipDate}>{active === 0 ? "Today" : `After ${active} ${active === 1 ? "year" : "years"}`}</p>
            {[...series]
              .sort((a, b) => b.values[active] - a.values[active])
              .map((s) => (
                <p key={s.id} className={styles.tooltipRow}>
                  <span
                    className={`${styles.lineKey} ${s.dashed ? styles.lineKeyDashed : ""}`}
                    style={s.dashed ? undefined : { borderTopColor: s.color }}
                    aria-hidden="true"
                  />
                  <strong>{formatValue(s.values[active])}</strong> {s.label}
                </p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
