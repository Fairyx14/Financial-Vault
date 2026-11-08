/**
 * Data for the Investment Vault charts.
 *
 * Nothing here invents market history. Portfolio value is only worked out on dates
 * where you recorded something that carries a price (a purchase, a sale or a price
 * update). On those dates, a holding without its own entry that day uses the last
 * price you entered for it, and the chart says so.
 */
import { Decimal } from "./decimal.ts";
import {
  CATEGORIES,
  orderedTransactions,
  summarizeHolding,
  type CategoryId,
  type Investment,
  type InvestmentCurrency,
  type PortfolioSummary,
} from "./investments.ts";

/* ---------- Portfolio value over time ---------- */

export interface HistoryPoint {
  /** YYYY-MM-DD */
  date: string;
  valueGBP: Decimal;
  /** Cost of the units held at the end of this date. */
  investedGBP: Decimal;
  /** Holdings owned on this date whose price came from an earlier entry. */
  carriedForward: number;
}

/** Only these entries record a price. Dividends and fees don't change the portfolio's market value. */
const PRICED = new Set(["buy", "sell", "price"]);

const upTo = (investment: Investment, date: string): Investment => ({
  ...investment,
  transactions: investment.transactions.filter((t) => t.date <= date),
});

export function portfolioHistory(investments: Investment[]): HistoryPoint[] {
  const dates = [
    ...new Set(investments.flatMap((inv) => inv.transactions.filter((t) => PRICED.has(t.type)).map((t) => t.date))),
  ].sort();

  return dates.map((date) => {
    let valueGBP = Decimal.ZERO;
    let investedGBP = Decimal.ZERO;
    let carriedForward = 0;
    for (const investment of investments) {
      const sofar = upTo(investment, date);
      if (!sofar.transactions.some((t) => PRICED.has(t.type))) continue; // not bought yet
      const summary = summarizeHolding(sofar);
      valueGBP = valueGBP.plus(summary.valueGBP);
      investedGBP = investedGBP.plus(summary.investedGBP);
      if (summary.quantity.isPositive() && summary.priceDate < date) carriedForward += 1;
    }
    return { date, valueGBP, investedGBP, carriedForward };
  });
}

/* ---------- One holding's recorded prices ---------- */

export interface PricePoint {
  date: string;
  /** Per unit, in the investment's own currency. */
  price: Decimal;
  source: "purchase" | "sale" | "update";
}

/** Every price you've recorded for one investment, oldest first. The last entry on a date wins. */
export function priceHistory(investment: Investment): PricePoint[] {
  const byDate = new Map<string, PricePoint>();
  for (const t of orderedTransactions(investment)) {
    if (t.type === "buy" || t.type === "sell" || t.type === "price") {
      byDate.set(t.date, {
        date: t.date,
        price: Decimal.of(t.price),
        source: t.type === "buy" ? "purchase" : t.type === "sell" ? "sale" : "update",
      });
    }
  }
  return [...byDate.values()];
}

/* ---------- Asset allocation ---------- */

export type AllocationBasis = "value" | "invested";

export interface AllocationSlice {
  category: CategoryId;
  label: string;
  amountGBP: Decimal;
  /** Share of the total, 0–100. */
  pct: Decimal;
}

/**
 * Share of the portfolio in each category, by current value or by amount invested.
 * Categories with nothing in them are left out. Slices keep the fixed category order,
 * so each category always gets the same colour.
 */
export function allocationByCategory(portfolio: PortfolioSummary, basis: AllocationBasis): AllocationSlice[] {
  const totals = new Map<CategoryId, Decimal>();
  for (const { investment, summary } of portfolio.holdings) {
    const amount = basis === "value" ? summary.valueGBP : summary.investedGBP;
    totals.set(investment.category, (totals.get(investment.category) ?? Decimal.ZERO).plus(amount));
  }
  const grand = Decimal.sum([...totals.values()]);
  if (!grand.isPositive()) return [];

  return CATEGORIES.filter((c) => totals.get(c.id)?.isPositive()).map((c) => {
    const amountGBP = totals.get(c.id)!;
    return { category: c.id, label: c.label, amountGBP, pct: amountGBP.dividedBy(grand).times(Decimal.HUNDRED) };
  });
}

/* ---------- Holdings comparison ---------- */

export interface HoldingBar {
  id: string;
  name: string;
  currency: InvestmentCurrency;
  investedGBP: Decimal;
  valueGBP: Decimal;
  gainGBP: Decimal;
}

/** Holdings you still own, largest current value first. Fully sold holdings are left out. */
export function holdingBars(portfolio: PortfolioSummary): HoldingBar[] {
  return portfolio.holdings
    .filter(({ summary }) => summary.quantity.isPositive())
    .map(({ investment, summary }) => ({
      id: investment.id,
      name: investment.name,
      currency: investment.currency,
      investedGBP: summary.investedGBP,
      valueGBP: summary.valueGBP,
      gainGBP: summary.gainGBP,
    }))
    .sort((a, b) => b.valueGBP.compare(a.valueGBP));
}
