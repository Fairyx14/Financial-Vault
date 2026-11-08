"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import { Decimal } from "@/lib/decimal";
import {
  categoryLabel,
  checkNumber,
  orderedTransactions,
  TRANSACTION_LABELS,
  type InvestmentTransaction,
  type LedgerEntry,
  type PortfolioHolding,
  type TransactionType,
} from "@/lib/investments";
import { formatDay, todayISO } from "@/lib/vault";
import { currencySymbol, direction, money, signedMoney, signedPercent, unitPrice, units } from "./format";
import Field from "./Field";
import GainLoss from "./GainLoss";
import PriceHistoryChart from "./PriceHistoryChart";
import vault from "../Vault.module.css";
import styles from "./investments.module.css";

interface HoldingDetailProps {
  holding: PortfolioHolding;
  onUpdatePrice: (update: { date: string; price: string; fxRate: string }) => void;
  onDelete: () => void;
  onDeleteTransaction: (transaction: InvestmentTransaction) => void;
}

const ACTIONS: { type: TransactionType; label: string; icon: string[] }[] = [
  { type: "buy", label: "Record purchase", icon: ["M12 5v14", "M5 12h14"] },
  { type: "sell", label: "Record sale", icon: ["M5 12h14"] },
  { type: "dividend", label: "Record dividend", icon: ["M12 3v18", "M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.6 5 3 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3"] },
  { type: "fee", label: "Record fee", icon: ["M6 3h12v18l-3-2-3 2-3-2-3 2V3Z", "M9 9h6", "M9 13h6"] },
];

const HISTORY_ICONS: Record<TransactionType, string[]> = {
  buy: ["M12 5v14", "M5 12h14"],
  sell: ["M5 12h14"],
  dividend: ["M12 3v18", "M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.6 5 3 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3"],
  fee: ["M6 3h12v18l-3-2-3 2-3-2-3 2V3Z", "M9 9h6"],
  price: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
};

export default function HoldingDetail({ holding, onUpdatePrice, onDelete, onDeleteTransaction }: HoldingDetailProps) {
  const { investment, summary, sharePct } = holding;
  const foreign = investment.currency !== "GBP";
  const history = [...summary.entries].reverse();
  const soldOut = summary.quantity.isZero();

  return (
    <section aria-labelledby="view-title">
      <a href="#/" className={vault.backLink}>
        <Icon paths={["M19 12H5", "m12 19-7-7 7-7"]} size={16} />
        All investments
      </a>

      <div className={vault.detailHeader}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            {investment.name}
          </h2>
          <p className={vault.viewSubtitle}>
            {[investment.ticker, categoryLabel(investment.category), investment.account, foreign ? `Priced in ${investment.currency}` : "", soldOut ? "All units sold" : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className={vault.detailActions}>
          <a href={`#/holding/${investment.id}/edit`} className={vault.buttonSecondary}>
            <Icon paths={["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"]} size={16} />
            Edit details
          </a>
          <button type="button" className={vault.buttonDanger} onClick={onDelete}>
            <Icon paths={["M4 7h16", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} size={16} />
            Delete
          </button>
        </div>
      </div>

      <nav aria-label="Record activity" className={styles.actionBar}>
        {ACTIONS.map((action) => (
          <a key={action.type} href={`#/holding/${investment.id}/add/${action.type}`} className={styles.actionButton}>
            <span className={styles.actionIcon} aria-hidden="true">
              <Icon paths={action.icon} size={16} />
            </span>
            {action.label}
          </a>
        ))}
      </nav>

      <div className={styles.detailGrid}>
        <div className={styles.valueCard}>
          <p className={styles.valueLabel}>Current value</p>
          <p className={styles.valueAmount}>{money(summary.valueGBP)}</p>
          {!soldOut && <GainLoss amount={summary.gainGBP} percent={summary.returnPct} size="lg" />}
          <p className={styles.valueNote}>
            {soldOut
              ? "You've sold all your units. Your realised result is shown below."
              : "Unrealised: this becomes a real gain or loss only when you sell."}
            {sharePct && !soldOut && ` This is ${sharePct.toFixed(1)}% of your portfolio.`}
          </p>
        </div>

        <dl className={styles.tiles}>
          <div className={styles.tile}>
            <dt>Units owned</dt>
            <dd>{units(summary.quantity)}</dd>
          </div>
          <div className={styles.tile}>
            <dt>Average cost</dt>
            <dd>{summary.averageCost ? unitPrice(summary.averageCost, investment.currency) : "–"}</dd>
            <dd className={styles.tileNote}>Per unit, including fees</dd>
          </div>
          <div className={styles.tile}>
            <dt>Total invested</dt>
            <dd>{money(summary.investedGBP)}</dd>
            <dd className={styles.tileNote}>Cost of the units you still hold</dd>
          </div>
          <div className={styles.tile}>
            <dt>Current price</dt>
            <dd>{unitPrice(summary.currentPrice, investment.currency)}</dd>
            <dd className={styles.tileNote}>
              Entered by you · {formatDay(summary.priceDate)}
              {foreign && ` · £${summary.currentFx.toString()} per ${currencySymbol(investment.currency)}1`}
            </dd>
          </div>
          <div className={styles.tile}>
            <dt>Share of portfolio</dt>
            <dd>{sharePct ? `${sharePct.toFixed(1)}%` : "–"}</dd>
            <dd className={styles.tileNote}>By current value</dd>
          </div>
          <div className={styles.tile}>
            <dt>Unrealised return</dt>
            <dd className={styles[direction(summary.returnPct)]}>
              {summary.returnPct ? signedPercent(summary.returnPct) : "–"}
            </dd>
            <dd className={styles.tileNote}>Unrealised gain ÷ invested</dd>
          </div>
        </dl>
      </div>

      <section className={`${vault.card} ${styles.breakdownCard}`} aria-labelledby="breakdown-title">
        <h3 id="breakdown-title" className={vault.cardTitle}>
          Performance breakdown
        </h3>
        <dl className={styles.breakdown}>
          <div>
            <dt>
              Unrealised gain / loss
              <span>On the units you still hold, at your latest price</span>
            </dt>
            <dd><GainLoss amount={summary.gainGBP} /></dd>
          </div>
          <div>
            <dt>
              Realised gain / loss
              <span>Locked in by sales</span>
            </dt>
            <dd><GainLoss amount={summary.realisedGBP} /></dd>
          </div>
          <div>
            <dt>
              Dividends received
              <span>Income, kept separate from gains</span>
            </dt>
            <dd className={summary.dividendsGBP.isPositive() ? styles.positive : styles.neutral}>
              {signedMoney(summary.dividendsGBP)}
            </dd>
          </div>
          {summary.feesGBP.isPositive() && (
            <div>
              <dt>
                Other fees
                <span>Charges not tied to a purchase or sale</span>
              </dt>
              <dd className={styles.negative}>{signedMoney(summary.feesGBP.negated())}</dd>
            </div>
          )}
          <div className={styles.breakdownTotal}>
            <dt>
              Total return
              <span>Compared with the {money(summary.totalBoughtGBP)} you&rsquo;ve paid for purchases in total</span>
            </dt>
            <dd><GainLoss amount={summary.totalReturnGBP} percent={summary.totalReturnPct} /></dd>
          </div>
        </dl>
      </section>

      <section className={`${vault.card} ${styles.breakdownCard}`} aria-labelledby="price-history-title">
        <div className={vault.cardHead}>
          <h3 id="price-history-title" className={vault.cardTitle}>
            Price history
          </h3>
          <span className={styles.recordedBadge}>Prices you entered</span>
        </div>
        <PriceHistoryChart investment={investment} />
      </section>

      <div className={styles.detailColumns}>
        <section className={vault.card} aria-labelledby="price-title">
          <h3 id="price-title" className={vault.cardTitle}>
            Update current price
          </h3>
          <PriceForm key={investment.id} holding={holding} onSubmit={onUpdatePrice} />
        </section>

        <section className={vault.card} aria-labelledby="history-title">
          <h3 id="history-title" className={vault.cardTitle}>
            History
          </h3>
          <ul className={vault.history}>
            {history.map((entry) => (
              <HistoryRow
                key={entry.transaction.id}
                entry={entry}
                holding={holding}
                onDelete={() => onDeleteTransaction(entry.transaction)}
              />
            ))}
          </ul>
          <p className={styles.tableNote}>
            Prices are values you entered, not live market data. Realised gains use the pooled average-cost method: a
            sale removes the same share of your total cost as its share of your units. This is a tracking figure, not a
            tax calculation.
          </p>
        </section>
      </div>
    </section>
  );
}

function HistoryRow({ entry, holding, onDelete }: { entry: LedgerEntry; holding: PortfolioHolding; onDelete: () => void }) {
  const { investment } = holding;
  const tx = entry.transaction;
  const currency = investment.currency;
  const foreign = currency !== "GBP";
  const label = TRANSACTION_LABELS[tx.type].toLowerCase();

  let title: string;
  let amount: React.ReactNode = null;
  switch (tx.type) {
    case "buy":
      title = `Bought ${units(Decimal.of(tx.quantity))} at ${unitPrice(Decimal.of(tx.price), currency)}`;
      amount = money(entry.cashNative, currency);
      break;
    case "sell":
      title = `Sold ${units(Decimal.of(tx.quantity))} at ${unitPrice(Decimal.of(tx.price), currency)}`;
      amount = (
        <>
          {money(entry.cashNative, currency)}
          {entry.realisedGBP && (
            <span className={styles.historyRealised}>
              Realised <GainLoss amount={entry.realisedGBP} />
            </span>
          )}
        </>
      );
      break;
    case "dividend":
      title = "Dividend received";
      amount = <span className={styles.positive}>{signedMoney(entry.cashNative, currency)}</span>;
      break;
    case "fee":
      title = "Fee charged";
      amount = <span className={styles.negative}>{signedMoney(entry.cashNative.negated(), currency)}</span>;
      break;
    case "price":
      title = `Price updated to ${unitPrice(Decimal.of(tx.price), currency)}`;
      break;
  }

  const details = [
    formatDay(tx.date),
    (tx.type === "buy" || tx.type === "sell") && tx.fees !== "0" ? `fees ${money(Decimal.of(tx.fees), currency)}` : "",
    foreign ? `£${tx.fxRate} per ${currencySymbol(currency)}1` : "",
    tx.type === "buy" || tx.type === "sell" ? `${units(entry.unitsAfter)} units after` : "",
  ].filter(Boolean);

  return (
    <li className={styles.historyRow}>
      <span className={`${vault.historyIcon} ${styles[`historyIcon_${tx.type}`] ?? ""}`} aria-hidden="true">
        <Icon paths={HISTORY_ICONS[tx.type]} size={16} />
      </span>
      <span className={vault.historyMain}>
        <span className={vault.historyNote}>{title}</span>
        <span className={vault.historyDate}>{details.join(" · ")}</span>
        {tx.note && <span className={styles.historyNoteText}>{tx.note}</span>}
      </span>
      <span className={styles.historyRight}>
        {amount && <span className={vault.historyAmounts}>{amount}</span>}
        <span className={styles.historyActions}>
          <a
            href={`#/holding/${investment.id}/tx/${tx.id}`}
            className={vault.iconButton}
            aria-label={`Edit ${label} on ${formatDay(tx.date)}`}
            title="Edit"
          >
            <Icon paths={["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"]} size={16} />
          </a>
          <button
            type="button"
            className={vault.iconButton}
            onClick={onDelete}
            aria-label={`Delete ${label} on ${formatDay(tx.date)}`}
            title="Delete"
          >
            <Icon paths={["M4 7h16", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} size={16} />
          </button>
        </span>
      </span>
    </li>
  );
}

function PriceForm({ holding, onSubmit }: { holding: PortfolioHolding; onSubmit: HoldingDetailProps["onUpdatePrice"] }) {
  const { investment, summary } = holding;
  const foreign = investment.currency !== "GBP";
  const today = todayISO();
  const firstPurchase = orderedTransactions(investment).find((entry) => entry.type === "buy")?.date;
  const [price, setPrice] = useState(summary.currentPrice.toString());
  const [fx, setFx] = useState(foreign ? summary.currentFx.toString() : "");
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<{ price?: string; fx?: string; date?: string }>({});
  const [saved, setSaved] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      price: checkNumber(price, { required: true, min: "zero", maxDecimals: 6, what: "the current price", example: "112.80" }),
      fx: foreign ? checkNumber(fx, { required: true, min: "positive", maxDecimals: 6, what: "today's exchange rate", example: "0.78" }) : undefined,
      date: !date
        ? "Enter the date of this price."
        : date > today
          ? "The date can't be in the future."
          : firstPurchase && date < firstPurchase
            ? `The date can't be before your first purchase (${formatDay(firstPurchase)}).`
            : undefined,
    };
    setErrors(next);
    setSaved(false);
    if (next.price || next.fx || next.date) return;
    onSubmit({ date, price, fxRate: fx });
    setSaved(true);
  };

  const symbol = currencySymbol(investment.currency);

  return (
    <form onSubmit={submit} noValidate className={styles.priceForm}>
      <p className={vault.muted}>Enter the latest price from your broker or a financial website. One update per day is kept.</p>
      <div className={styles.priceFields}>
        <Field id="price-new" label="Price per unit" inputMode="decimal" prefix={symbol} value={price} onChange={setPrice} error={errors.price} />
        {foreign && (
          <Field id="price-fx" label="Exchange rate" inputMode="decimal" prefix="£" suffix={`per ${symbol}1`} value={fx} onChange={setFx} error={errors.fx} />
        )}
        <Field id="price-date" type="date" label="Price date" value={date} onChange={setDate} error={errors.date} max={today} />
      </div>
      <div className={vault.formActions}>
        <button type="submit" className={vault.buttonPrimary}>
          Save price
        </button>
        <p className={styles.savedNote} aria-live="polite">
          {saved ? "Price saved." : ""}
        </p>
      </div>
    </form>
  );
}
