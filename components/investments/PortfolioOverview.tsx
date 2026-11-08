import { formatDay } from "@/lib/vault";
import type { PortfolioSummary } from "@/lib/investments";
import { direction, money, signedPercent } from "./format";
import GainLoss from "./GainLoss";
import styles from "./investments.module.css";

export default function PortfolioOverview({ portfolio }: { portfolio: PortfolioSummary }) {
  const latestPriceDate = portfolio.holdings.reduce(
    (latest, { summary }) => (summary.priceDate > latest ? summary.priceDate : latest),
    "",
  );
  const foreign = portfolio.holdings.filter(({ investment }) => investment.currency !== "GBP");
  const hasDividends = portfolio.dividendsGBP.isPositive();
  const hasFees = portfolio.feesGBP.isPositive();

  return (
    <section aria-labelledby="overview-title" className={styles.overview}>
      <h3 id="overview-title" className="visually-hidden">
        Portfolio overview
      </h3>

      <div className={styles.valueCard}>
        <p className={styles.valueLabel}>Portfolio value</p>
        <p className={styles.valueAmount}>{money(portfolio.valueGBP)}</p>
        <GainLoss amount={portfolio.gainGBP} percent={portfolio.returnPct} size="lg" />
        <p className={styles.valueNote}>
          Unrealised gain or loss on what you hold now, using prices you entered
          {latestPriceDate ? ` (most recently on ${formatDay(latestPriceDate)})` : ""}.
        </p>
      </div>

      <dl className={styles.tiles}>
        <div className={styles.tile}>
          <dt>Total invested</dt>
          <dd>{money(portfolio.investedGBP)}</dd>
          <dd className={styles.tileNote}>Cost of what you hold, incl. fees</dd>
        </div>
        <div className={styles.tile}>
          <dt>Unrealised gain / loss</dt>
          <dd>
            <GainLoss amount={portfolio.gainGBP} />
          </dd>
          <dd className={styles.tileNote}>At current prices</dd>
        </div>
        {portfolio.hasSales && (
          <div className={styles.tile}>
            <dt>Realised gain / loss</dt>
            <dd>
              <GainLoss amount={portfolio.realisedGBP} />
            </dd>
            <dd className={styles.tileNote}>Locked in by sales</dd>
          </div>
        )}
        {hasDividends && (
          <div className={styles.tile}>
            <dt>Dividends received</dt>
            <dd className={styles.positive}>{money(portfolio.dividendsGBP)}</dd>
            <dd className={styles.tileNote}>Income, separate from gains</dd>
          </div>
        )}
        <div className={styles.tile}>
          <dt>Total return</dt>
          <dd>
            <GainLoss amount={portfolio.totalReturnGBP} />
          </dd>
          <dd className={`${styles.tileNote} ${styles[direction(portfolio.totalReturnPct)]}`}>
            {portfolio.totalReturnPct ? signedPercent(portfolio.totalReturnPct) : "–"} of{" "}
            {money(portfolio.totalBoughtGBP)} paid in
          </dd>
        </div>
        <div className={styles.tile}>
          <dt>Investments</dt>
          <dd>{portfolio.count}</dd>
          <dd className={styles.tileNote}>
            {portfolio.soldOutCount > 0 ? `${portfolio.soldOutCount} fully sold` : "Holdings tracked"}
          </dd>
        </div>
      </dl>

      <p className={styles.fxNote}>
        <strong>How total return works:</strong> unrealised gain + realised gain
        {hasDividends ? " + dividends" : ""}
        {hasFees ? ` − other fees (${money(portfolio.feesGBP)})` : ""}, compared with everything you&rsquo;ve paid for
        purchases. Dividends are never counted as gains, and sales only count the difference from what the units cost.
        {foreign.length > 0 && (
          <>
            {" "}
            <strong>Currencies:</strong> {foreign.length} {foreign.length === 1 ? "holding is" : "holdings are"} priced in{" "}
            {[...new Set(foreign.map(({ investment }) => investment.currency))].join(" and ")}; each entry is converted at the
            exchange rate you recorded with it, and current value uses your latest rate.
          </>
        )}
      </p>
    </section>
  );
}
