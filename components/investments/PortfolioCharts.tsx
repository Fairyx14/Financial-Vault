"use client";

import { useMemo } from "react";
import { portfolioHistory } from "@/lib/investmentCharts";
import type { Investment, PortfolioSummary } from "@/lib/investments";
import { Decimal } from "@/lib/decimal";
import { formatMoneyCompact } from "@/lib/plan";
import { formatDay } from "@/lib/vault";
import AllocationChart from "./AllocationChart";
import HoldingsBarChart from "./HoldingsBarChart";
import StepLineChart from "./StepLineChart";
import { money } from "./format";
import styles from "./charts.module.css";

interface PortfolioChartsProps {
  investments: Investment[];
  portfolio: PortfolioSummary;
}

export default function PortfolioCharts({ investments, portfolio }: PortfolioChartsProps) {
  const history = useMemo(() => portfolioHistory(investments), [investments]);
  const pounds = (n: number) => money(Decimal.of(n.toFixed(2)));
  const last = history.at(-1);

  return (
    <section aria-labelledby="charts-title" className={styles.section}>
      <h3 id="charts-title" className={styles.sectionTitle}>
        Performance
      </h3>

      <article className={`${styles.card} ${styles.cardWide}`} aria-labelledby="history-chart-title">
        <div className={styles.cardHead}>
          <h4 id="history-chart-title" className={styles.cardTitle}>
            Portfolio value over time
          </h4>
          <span className={styles.badge}>Recorded data only</span>
        </div>
        <p className={styles.cardIntro}>
          Plotted only on dates you recorded a price, purchase or sale. Between those dates nothing is known, so the line
          stays flat; where a holding had no entry on a date, its last price you entered is used.
        </p>
        <StepLineChart
          dates={history.map((p) => p.date)}
          series={[
            { id: "value", label: "Portfolio value", values: history.map((p) => p.valueGBP.toNumber()), style: "solid" },
            { id: "invested", label: "Invested capital", values: history.map((p) => p.investedGBP.toNumber()), style: "dashed" },
          ]}
          formatValue={pounds}
          formatAxis={(n) => formatMoneyCompact(n, "GBP")}
          summary={
            last
              ? `Portfolio value from ${formatDay(history[0].date)} to ${formatDay(last.date)}, ending at ${money(last.valueGBP)} against ${money(last.investedGBP)} invested.`
              : "Portfolio value over time."
          }
          pointNote={(i) => {
            const n = history[i].carriedForward;
            return n > 0 ? `${n} ${n === 1 ? "holding uses" : "holdings use"} an earlier price` : undefined;
          }}
          emptyMessage="This chart builds up as you record prices on different dates. Update a price on another day to see your first line."
        />
      </article>

      <div className={styles.pair}>
        <article className={styles.card} aria-labelledby="allocation-title">
          <div className={styles.cardHead}>
            <h4 id="allocation-title" className={styles.cardTitle}>
              Asset allocation
            </h4>
          </div>
          <p className={styles.cardIntro}>How your portfolio is split across categories.</p>
          <AllocationChart portfolio={portfolio} />
        </article>

        <article className={styles.card} aria-labelledby="bars-title">
          <div className={styles.cardHead}>
            <h4 id="bars-title" className={styles.cardTitle}>
              Invested vs current value
            </h4>
          </div>
          <p className={styles.cardIntro}>What you paid for each holding you own, next to what it&rsquo;s worth now.</p>
          <HoldingsBarChart portfolio={portfolio} />
        </article>
      </div>
    </section>
  );
}
