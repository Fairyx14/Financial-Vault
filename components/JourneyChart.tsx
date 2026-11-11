"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatMoney, formatMoneyCompact, monthsToReach, type CurrencyCode } from "@/lib/plan";
import {
  addMonths,
  balanceOn,
  currentBalance,
  forecastFor,
  originalPlanInput,
  parseISODate,
  plannedBalance,
  toISODate,
  wholeMonthsBetween,
  formatDay,
  type SavedGoal,
} from "@/lib/vault";
import styles from "./Vault.module.css";

interface JourneyPoint {
  date: Date;
  /** Saved balance on this date; null for future dates. */
  actual: number | null;
  plan: number;
  isToday: boolean;
}

const HEIGHT = 260;
const MARGIN = { top: 20, right: 20, bottom: 30, left: 56 };
const MAX_MONTHS_SHOWN = 600;

/** Monthly points from the goal's start until the later of the planned and forecast finish, plus today. */
function buildJourney(goal: SavedGoal, today: Date): JourneyPoint[] {
  const start = parseISODate(goal.createdAt);
  const elapsed = wholeMonthsBetween(start, today);
  const plannedMonths = monthsToReach(goal.target, originalPlanInput(goal)) ?? 0;
  const forecastMonths = forecastFor(goal).months ?? 12;
  const end = Math.min(Math.max(plannedMonths, elapsed + forecastMonths, elapsed + 1, 6), MAX_MONTHS_SHOWN);

  const todayIso = toISODate(today);
  const points: JourneyPoint[] = [];

  for (let month = 0; month <= end; month++) {
    const date = addMonths(start, month);
    const iso = toISODate(date);
    if (iso === todayIso) {
      points.push({ date: today, actual: currentBalance(goal), plan: plannedBalance(goal, month), isToday: true });
      continue;
    }
    // Insert "today" between the anniversaries it falls between.
    if (iso > todayIso && !points.some((point) => point.isToday)) {
      points.push({ date: today, actual: currentBalance(goal), plan: plannedBalance(goal, elapsed), isToday: true });
    }
    points.push({
      date,
      actual: iso < todayIso ? balanceOn(goal, date) : null,
      plan: plannedBalance(goal, month),
      isToday: false,
    });
  }
  return points;
}

/** Rounds up to a 1, 2, 2.5 or 5 step so axis labels read cleanly. */
function niceStep(raw: number): number {
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return nice * power;
}

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });
const yearLabel = new Intl.DateTimeFormat("en-GB", { year: "numeric" });
const tooltipMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export default function JourneyChart({ goal, currency }: { goal: SavedGoal; currency: CurrencyCode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => buildJourney(goal, new Date()), [goal]);
  const todayIndex = points.findIndex((point) => point.isToday);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const t0 = points[0].date.getTime();
  const t1 = points[points.length - 1].date.getTime();
  const x = (date: Date) => MARGIN.left + ((date.getTime() - t0) / Math.max(t1 - t0, 1)) * innerWidth;

  const highest = Math.max(goal.target, ...points.map((point) => point.actual ?? 0));
  const step = niceStep(highest / 4);
  const yMax = Math.ceil(highest / step) * step;
  const y = (value: number) => MARGIN.top + innerHeight * (1 - Math.max(value, 0) / yMax);
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  // X ticks: pick a month interval that leaves room for each label.
  const totalMonths = Math.max(wholeMonthsBetween(points[0].date, points[points.length - 1].date), 1);
  const intervals = [1, 2, 3, 6, 12, 24, 60, 120];
  const interval =
    intervals.find((months) => (innerWidth / (totalMonths / months)) >= (months >= 12 ? 48 : 60)) ?? 120;
  const start = parseISODate(goal.createdAt);
  const xTicks: Date[] = [];
  for (let month = 0; month <= totalMonths; month += interval) xTicks.push(addMonths(start, month));
  const tickLabel = (date: Date) => (interval >= 12 ? yearLabel : monthLabel).format(date);

  const planPath = points.map((point, i) => `${i ? "L" : "M"}${x(point.date)},${y(point.plan)}`).join("");
  const actualPoints = points.filter((point) => point.actual !== null);
  const actualPath = actualPoints.map((point, i) => `${i ? "L" : "M"}${x(point.date)},${y(point.actual!)}`).join("");
  const baseline = y(0);
  const areaPath =
    actualPoints.length > 1
      ? `${actualPath}L${x(actualPoints[actualPoints.length - 1].date)},${baseline}L${x(actualPoints[0].date)},${baseline}Z`
      : "";

  const today = points[todayIndex];

  /* ---------- Hover & keyboard ---------- */
  const nearestIndex = (pixelX: number) => {
    let best = 0;
    points.forEach((point, i) => {
      if (Math.abs(x(point.date) - pixelX) < Math.abs(x(points[best].date) - pixelX)) best = i;
    });
    return best;
  };

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    setActive(nearestIndex(event.clientX - box.left));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive((current) => {
      const from = current ?? todayIndex;
      return Math.min(Math.max(from + moves[event.key], 0), points.length - 1);
    });
  };

  const activePoint = active === null ? null : points[active];
  const tooltipLeft = activePoint ? Math.min(Math.max(x(activePoint.date) + 14, 8), width - 190) : 0;
  const money = (value: number) => formatMoney(value, currency);

  const summary = `Savings journey for ${goal.name}. Started ${formatDay(goal.createdAt)}. Today you have ${money(
    today.actual ?? 0,
  )}; the plan expected ${money(today.plan)}. Goal: ${money(goal.target)}.`;

  return (
    <figure className={styles.chartFigure}>
      <ul className={styles.legend} aria-hidden="true">
        <li>
          <span className={`${styles.legendKey} ${styles.legendKeyActual}`} />
          Your savings
        </li>
        <li>
          <span className={`${styles.legendKey} ${styles.legendKeyPlan}`} />
          Plan
        </li>
      </ul>

      <div
        ref={wrapRef}
        className={styles.chartWrap}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use the left and right arrow keys to step through months.`}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((current) => current ?? todayIndex)}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} className={styles.chartSvg} aria-hidden="true">
          <defs>
            <linearGradient id={`area-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--color-primary)" }} stopOpacity="0.22" />
              <stop offset="100%" style={{ stopColor: "var(--color-primary)" }} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className={styles.gridLine} />
              <text x={MARGIN.left - 10} y={y(tick)} className={styles.axisLabel} textAnchor="end" dominantBaseline="middle">
                {formatMoneyCompact(tick, currency)}
              </text>
            </g>
          ))}

          {xTicks.map((tick) => (
            <text key={tick.getTime()} x={x(tick)} y={HEIGHT - 8} className={styles.axisLabel} textAnchor="middle">
              {tickLabel(tick)}
            </text>
          ))}

          {/* Goal line, labelled directly */}
          <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(goal.target)} y2={y(goal.target)} className={styles.goalLine} />
          <text x={width - MARGIN.right} y={y(goal.target) - 7} textAnchor="end" className={styles.goalLineLabel}>
            Goal {formatMoneyCompact(goal.target, currency)}
          </text>

          <path d={planPath} className={styles.planLine} />
          {areaPath && <path d={areaPath} fill={`url(#area-${goal.id})`} />}
          {actualPath && <path d={actualPath} className={styles.actualLine} />}

          {today && today.actual !== null && (
            <g>
              <circle cx={x(today.date)} cy={y(today.actual)} r={6} className={styles.todayDot} />
              <text
                x={Math.min(Math.max(x(today.date), MARGIN.left + 20), width - MARGIN.right - 20)}
                // Put the label on the side away from the plan line so they don't collide.
                y={today.actual < today.plan ? y(today.actual) + 22 : y(today.actual) - 14}
                textAnchor="middle"
                className={styles.todayLabel}
              >
                Today
              </text>
            </g>
          )}

          {activePoint && (
            <g>
              <line
                x1={x(activePoint.date)}
                x2={x(activePoint.date)}
                y1={MARGIN.top}
                y2={baseline}
                className={styles.crosshair}
              />
              <circle cx={x(activePoint.date)} cy={y(activePoint.plan)} r={4.5} className={styles.planDot} />
              {activePoint.actual !== null && (
                <circle cx={x(activePoint.date)} cy={y(activePoint.actual)} r={5} className={styles.actualDot} />
              )}
            </g>
          )}

          <rect
            x={MARGIN.left}
            y={0}
            width={innerWidth}
            height={HEIGHT}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {activePoint && (
          <div className={styles.tooltip} style={{ left: tooltipLeft, top: MARGIN.top }} aria-live="polite">
            <p className={styles.tooltipDate}>
              {activePoint.isToday ? `Today, ${formatDay(toISODate(activePoint.date))}` : tooltipMonth.format(activePoint.date)}
            </p>
            {activePoint.actual !== null && (
              <p className={styles.tooltipRow}>
                <span className={`${styles.legendKey} ${styles.legendKeyActual}`} aria-hidden="true" />
                <strong>{money(activePoint.actual)}</strong> saved
              </p>
            )}
            <p className={styles.tooltipRow}>
              <span className={`${styles.legendKey} ${styles.legendKeyPlan}`} aria-hidden="true" />
              <strong>{money(activePoint.plan)}</strong> plan
            </p>
          </div>
        )}
      </div>
      <figcaption className={styles.chartCaption}>
        Solid line: what you&rsquo;ve saved. Dashed line: the plan you set when you created this goal.
      </figcaption>
    </figure>
  );
}
