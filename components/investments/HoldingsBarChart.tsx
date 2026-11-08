import { holdingBars } from "@/lib/investmentCharts";
import type { PortfolioSummary } from "@/lib/investments";
import { Decimal } from "@/lib/decimal";
import { money } from "./format";
import GainLoss from "./GainLoss";
import styles from "./charts.module.css";

/**
 * Invested vs current value for each holding, as paired horizontal bars.
 * Every bar carries its value as a direct label, so nothing depends on hovering.
 */
export default function HoldingsBarChart({ portfolio }: { portfolio: PortfolioSummary }) {
  const bars = holdingBars(portfolio);
  if (bars.length === 0) return <p className={styles.empty}>Nothing held right now.</p>;

  const largest = bars.reduce((max, b) => {
    const top = b.valueGBP.compare(b.investedGBP) > 0 ? b.valueGBP : b.investedGBP;
    return top.compare(max) > 0 ? top : max;
  }, Decimal.ZERO);
  const width = (amount: Decimal) => (largest.isPositive() ? `${Math.max(amount.dividedBy(largest).toNumber() * 100, 0.5)}%` : "0%");

  return (
    <div className={styles.barsChart}>
      <ul className={styles.legend} aria-hidden="true">
        <li>
          <span className={`${styles.barKey} ${styles.barKeyInvested}`} />
          Invested
        </li>
        <li>
          <span className={styles.barKey} />
          Current value
        </li>
      </ul>
      <ul className={styles.barRows}>
        {bars.map((bar) => (
          <li key={bar.id} className={styles.barRow}>
            <div className={styles.barHead}>
              <a href={`#/holding/${bar.id}`} className={styles.barName}>
                {bar.name}
              </a>
              <GainLoss amount={bar.gainGBP} />
            </div>
            <div className={styles.barPair}>
              <div className={styles.barLine}>
                <span className={styles.barTrack} aria-hidden="true">
                  <span className={`${styles.bar} ${styles.barInvested}`} style={{ width: width(bar.investedGBP) }} />
                </span>
                <span className={styles.barValue}>
                  <span className="visually-hidden">Invested </span>
                  {money(bar.investedGBP)}
                </span>
              </div>
              <div className={styles.barLine}>
                <span className={styles.barTrack} aria-hidden="true">
                  <span className={styles.bar} style={{ width: width(bar.valueGBP) }} />
                </span>
                <span className={styles.barValue}>
                  <span className="visually-hidden">Current value </span>
                  {money(bar.valueGBP)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {portfolio.soldOutCount > 0 && (
        <p className={styles.chartNote}>
          {portfolio.soldOutCount} fully sold {portfolio.soldOutCount === 1 ? "holding isn't" : "holdings aren't"} shown.
        </p>
      )}
    </div>
  );
}
