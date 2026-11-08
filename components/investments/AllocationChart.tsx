"use client";

import { useState } from "react";
import { allocationByCategory, type AllocationBasis } from "@/lib/investmentCharts";
import type { CategoryId, PortfolioSummary } from "@/lib/investments";
import { Decimal } from "@/lib/decimal";
import { categoryColor } from "./categoryColors";
import { money } from "./format";
import vault from "../Vault.module.css";
import styles from "./charts.module.css";

const SIZE = 220;
const STROKE = 30;
const RADIUS = (SIZE - STROKE) / 2;
/** Gap between slices, in percent of the ring, so neighbouring colours never touch. */
const GAP = 0.8;

export default function AllocationChart({ portfolio }: { portfolio: PortfolioSummary }) {
  const [basis, setBasis] = useState<AllocationBasis>("value");
  const [active, setActive] = useState<CategoryId | null>(null);
  const slices = allocationByCategory(portfolio, basis);
  const total = Decimal.sum(slices.map((s) => s.amountGBP));
  const current = slices.find((s) => s.category === active);

  let start = 0;
  const arcs = slices.map((slice) => {
    const pct = slice.pct.toNumber();
    const gap = slices.length > 1 ? GAP : 0;
    const arc = { slice, start, length: Math.max(pct - gap, 0.2) };
    start += pct;
    return arc;
  });

  return (
    <div className={styles.allocation}>
      <fieldset className={`${vault.segmented} ${styles.basisToggle}`}>
        <legend className="visually-hidden">Measure allocation by</legend>
        {(["value", "invested"] as AllocationBasis[]).map((option) => (
          <label key={option} className={`${vault.segment} ${basis === option ? vault.segmentActive : ""}`}>
            <input
              type="radio"
              name="allocation-basis"
              value={option}
              checked={basis === option}
              onChange={() => setBasis(option)}
              className="visually-hidden"
            />
            {option === "value" ? "Current value" : "Amount invested"}
          </label>
        ))}
      </fieldset>

      {slices.length === 0 ? (
        <p className={styles.empty}>Allocation appears once you hold something worth more than £0.</p>
      ) : (
        <div className={styles.allocationBody}>
          <div className={styles.donutWrap}>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.donut} aria-hidden="true">
              <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} className={styles.donutTrack} strokeWidth={STROKE} />
              {arcs.map(({ slice, start: offset, length }) => (
                <circle
                  key={slice.category}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  pathLength={100}
                  fill="none"
                  stroke={categoryColor(slice.category)}
                  strokeWidth={active === slice.category ? STROKE + 6 : STROKE}
                  strokeDasharray={`${length} ${100 - length}`}
                  strokeDashoffset={-offset}
                  className={`${styles.donutSlice} ${active && active !== slice.category ? styles.donutDim : ""}`}
                  onPointerEnter={() => setActive(slice.category)}
                  onPointerLeave={() => setActive(null)}
                />
              ))}
            </svg>
            <div className={styles.donutCenter} aria-hidden="true">
              <span className={styles.donutLabel}>{current ? current.label : basis === "value" ? "Total value" : "Total invested"}</span>
              <span className={styles.donutValue}>{current ? `${current.pct.toFixed(1)}%` : money(total)}</span>
              {current && <span className={styles.donutSub}>{money(current.amountGBP)}</span>}
            </div>
          </div>

          {/* The legend doubles as the table view: every slice's value and share is always visible. */}
          <ul className={styles.allocLegend} aria-label={`Allocation by ${basis === "value" ? "current value" : "amount invested"}`}>
            {slices.map((slice) => (
              <li key={slice.category}>
                <button
                  type="button"
                  className={`${styles.allocItem} ${active === slice.category ? styles.allocItemActive : ""}`}
                  onPointerEnter={() => setActive(slice.category)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(slice.category)}
                  onBlur={() => setActive(null)}
                  aria-label={`${slice.label}: ${slice.pct.toFixed(1)} percent, ${money(slice.amountGBP)}`}
                >
                  <span className={styles.swatch} style={{ background: categoryColor(slice.category) }} aria-hidden="true" />
                  <span className={styles.allocName}>{slice.label}</span>
                  <span className={styles.allocPct}>{slice.pct.toFixed(1)}%</span>
                  <span className={styles.allocAmount}>{money(slice.amountGBP)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
