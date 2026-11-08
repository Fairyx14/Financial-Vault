/**
 * Investment Vault data model and calculations.
 *
 * Every investment keeps a list of transactions. All amounts are stored as decimal
 * strings and calculated with Decimal, so nothing drifts through rounding.
 * Exchange rates are "GBP per 1 unit of the investment's currency", always entered
 * by the user; for GBP investments the rate is exactly 1.
 *
 * COST BASIS — pooled average cost
 * All units of one investment form a single pool with a total cost.
 *   Purchase:  units += quantity;  pool cost += quantity × price + fees
 *   Sale:      the sale removes the same share of the pool cost as its share of units.
 *              e.g. selling 25 of 100 units removes 25% of the pool cost.
 *              realised gain = (quantity × price − fees) − cost removed
 *              The rest of the sale money is your own capital coming back, not profit.
 *   Average cost per unit = pool cost ÷ units (includes purchase fees).
 * This mirrors the UK "Section 104" pooling idea but ignores the same-day and 30-day
 * matching rules, so it's a tracking figure, not a tax calculation.
 *
 * RETURN — four separate parts, so nothing is counted twice
 *   unrealised gain = current value − pool cost of units still held
 *   realised gain   = Σ realised gains on sales
 *   dividends       = Σ dividends received (never added to cost or realised gain)
 *   other fees      = Σ standalone fees, e.g. platform charges (purchase/sale fees are
 *                     already inside cost and proceeds)
 *   total return    = unrealised + realised + dividends − other fees
 *   total return %  = total return ÷ total ever paid for purchases (incl. fees)
 *
 * Every figure is converted to GBP at the rate recorded on that transaction's date;
 * current value uses the rate from your latest price entry.
 */
import { Decimal } from "./decimal.ts";

export const CATEGORIES = [
  { id: "stocks", label: "Stocks" },
  { id: "etfs", label: "ETFs" },
  { id: "index-funds", label: "Index funds" },
  { id: "mutual-funds", label: "Mutual funds" },
  { id: "bonds", label: "Bonds" },
  { id: "commodities", label: "Gold & commodities" },
  { id: "crypto", label: "Cryptocurrency" },
  { id: "other", label: "Other" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const categoryLabel = (id: CategoryId) => CATEGORIES.find((category) => category.id === id)?.label ?? "Other";

export const INVESTMENT_CURRENCIES = {
  GBP: { label: "British pound (£)", symbol: "£" },
  USD: { label: "US dollar ($)", symbol: "$" },
  EUR: { label: "Euro (€)", symbol: "€" },
} as const;

export type InvestmentCurrency = keyof typeof INVESTMENT_CURRENCIES;

/* ---------- Transactions ---------- */

interface BaseTransaction {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** GBP per 1 unit of the investment's currency on this date. "1" for GBP. */
  fxRate: string;
  note?: string;
}

export interface BuyTransaction extends BaseTransaction {
  type: "buy";
  quantity: string;
  /** Price per unit, in the investment's currency. */
  price: string;
  /** Total fees for this purchase. */
  fees: string;
}

export interface SellTransaction extends BaseTransaction {
  type: "sell";
  quantity: string;
  price: string;
  fees: string;
}

export interface DividendTransaction extends BaseTransaction {
  type: "dividend";
  /** Total dividend received, in the investment's currency. */
  amount: string;
}

export interface FeeTransaction extends BaseTransaction {
  type: "fee";
  /** A standalone charge, e.g. a platform fee. */
  amount: string;
}

export interface PriceUpdate extends BaseTransaction {
  type: "price";
  price: string;
}

export type InvestmentTransaction = BuyTransaction | SellTransaction | DividendTransaction | FeeTransaction | PriceUpdate;
export type TransactionType = InvestmentTransaction["type"];

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  buy: "Purchase",
  sell: "Sale",
  dividend: "Dividend",
  fee: "Fee",
  price: "Price update",
};

export interface Investment {
  id: string;
  name: string;
  ticker: string;
  category: CategoryId;
  account: string;
  currency: InvestmentCurrency;
  createdAt: string;
  transactions: InvestmentTransaction[];
}

/** Oldest first; same-day entries keep the order they were recorded. */
export function orderedTransactions(investment: Investment): InvestmentTransaction[] {
  return investment.transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) =>
      a.transaction.date === b.transaction.date ? a.index - b.index : a.transaction.date < b.transaction.date ? -1 : 1,
    )
    .map(({ transaction }) => transaction);
}

/* ---------- Ledger: replays the history in date order ---------- */

export interface LedgerEntry {
  transaction: InvestmentTransaction;
  /** Units owned after this transaction. */
  unitsAfter: Decimal;
  /** Money in the investment's currency: purchase cost, net sale proceeds, dividend or fee. Zero for price updates. */
  cashNative: Decimal;
  /** Sales only. */
  realisedGBP?: Decimal;
  costRemovedGBP?: Decimal;
}

/** A sale of more units than were owned at that point in the history. */
export interface LedgerProblem {
  transactionId: string;
  date: string;
  attempted: Decimal;
  available: Decimal;
}

interface Ledger {
  entries: LedgerEntry[];
  problem: LedgerProblem | null;
  quantity: Decimal;
  costNative: Decimal;
  costGBP: Decimal;
  totalBoughtGBP: Decimal;
  realisedGBP: Decimal;
  dividendsGBP: Decimal;
  feesGBP: Decimal;
  latest: { price: Decimal; fx: Decimal; date: string; fromUpdate: boolean } | null;
}

function runLedger(investment: Investment): Ledger {
  const ledger: Ledger = {
    entries: [],
    problem: null,
    quantity: Decimal.ZERO,
    costNative: Decimal.ZERO,
    costGBP: Decimal.ZERO,
    totalBoughtGBP: Decimal.ZERO,
    realisedGBP: Decimal.ZERO,
    dividendsGBP: Decimal.ZERO,
    feesGBP: Decimal.ZERO,
    latest: null,
  };

  for (const transaction of orderedTransactions(investment)) {
    const fx = Decimal.of(transaction.fxRate || "1");
    const entry: LedgerEntry = { transaction, unitsAfter: ledger.quantity, cashNative: Decimal.ZERO };

    switch (transaction.type) {
      case "buy": {
        const units = Decimal.of(transaction.quantity);
        const price = Decimal.of(transaction.price);
        const cost = units.times(price).plus(Decimal.of(transaction.fees || "0"));
        ledger.quantity = ledger.quantity.plus(units);
        ledger.costNative = ledger.costNative.plus(cost);
        ledger.costGBP = ledger.costGBP.plus(cost.times(fx));
        ledger.totalBoughtGBP = ledger.totalBoughtGBP.plus(cost.times(fx));
        ledger.latest = { price, fx, date: transaction.date, fromUpdate: false };
        entry.cashNative = cost;
        break;
      }
      case "sell": {
        let units = Decimal.of(transaction.quantity);
        const price = Decimal.of(transaction.price);
        if (units.compare(ledger.quantity) > 0) {
          ledger.problem ??= {
            transactionId: transaction.id,
            date: transaction.date,
            attempted: units,
            available: ledger.quantity,
          };
          units = ledger.quantity; // Keep calculating with what was actually owned.
        }
        const proceeds = units.times(price).minus(Decimal.of(transaction.fees || "0"));
        // Selling everything removes the whole pool exactly, with no rounding left over.
        const sellingAll = units.compare(ledger.quantity) === 0;
        const share = ledger.quantity.isZero() ? Decimal.ZERO : units.dividedBy(ledger.quantity);
        const removedNative = sellingAll ? ledger.costNative : ledger.costNative.times(share);
        const removedGBP = sellingAll ? ledger.costGBP : ledger.costGBP.times(share);
        const realisedGBP = proceeds.times(fx).minus(removedGBP);

        ledger.quantity = ledger.quantity.minus(units);
        ledger.costNative = ledger.costNative.minus(removedNative);
        ledger.costGBP = ledger.costGBP.minus(removedGBP);
        ledger.realisedGBP = ledger.realisedGBP.plus(realisedGBP);
        ledger.latest = { price, fx, date: transaction.date, fromUpdate: false };
        entry.cashNative = proceeds;
        entry.realisedGBP = realisedGBP;
        entry.costRemovedGBP = removedGBP;
        break;
      }
      case "dividend": {
        const amount = Decimal.of(transaction.amount);
        ledger.dividendsGBP = ledger.dividendsGBP.plus(amount.times(fx));
        entry.cashNative = amount;
        break;
      }
      case "fee": {
        const amount = Decimal.of(transaction.amount);
        ledger.feesGBP = ledger.feesGBP.plus(amount.times(fx));
        entry.cashNative = amount;
        break;
      }
      case "price": {
        ledger.latest = { price: Decimal.of(transaction.price), fx, date: transaction.date, fromUpdate: true };
        break;
      }
    }

    entry.unitsAfter = ledger.quantity;
    ledger.entries.push(entry);
  }

  return ledger;
}

/* ---------- Holding & portfolio summaries ---------- */

export interface HoldingSummary {
  quantity: Decimal;
  /** Pool cost of the units still held (investment currency). */
  investedNative: Decimal;
  /** Pool cost of the units still held, in GBP. Shown as "Total invested". */
  investedGBP: Decimal;
  /** Per unit, in the investment's currency, including fees. Null when no units are held. */
  averageCost: Decimal | null;
  currentPrice: Decimal;
  priceDate: string;
  /** True when the current price came from a price update rather than a purchase or sale. */
  priceFromUpdate: boolean;
  currentFx: Decimal;
  valueNative: Decimal;
  valueGBP: Decimal;
  /** Unrealised gain or loss on units still held. */
  gainGBP: Decimal;
  /** Unrealised gain ÷ invested × 100. Null when nothing is held. */
  returnPct: Decimal | null;
  realisedGBP: Decimal;
  dividendsGBP: Decimal;
  /** Standalone fees only. */
  feesGBP: Decimal;
  /** Everything ever paid for purchases, including fees, in GBP. */
  totalBoughtGBP: Decimal;
  totalReturnGBP: Decimal;
  totalReturnPct: Decimal | null;
  /** History with running units, oldest first. */
  entries: LedgerEntry[];
  /** Set only if stored data somehow oversells (the app prevents this). */
  problem: LedgerProblem | null;
}

export function summarizeHolding(investment: Investment): HoldingSummary {
  const ledger = runLedger(investment);
  const currentPrice = ledger.latest?.price ?? Decimal.ZERO;
  const currentFx = ledger.latest?.fx ?? Decimal.ONE;
  const valueNative = ledger.quantity.times(currentPrice);
  const valueGBP = valueNative.times(currentFx);
  const gainGBP = valueGBP.minus(ledger.costGBP);
  const totalReturnGBP = gainGBP.plus(ledger.realisedGBP).plus(ledger.dividendsGBP).minus(ledger.feesGBP);

  return {
    quantity: ledger.quantity,
    investedNative: ledger.costNative,
    investedGBP: ledger.costGBP,
    averageCost: ledger.quantity.isPositive() ? ledger.costNative.dividedBy(ledger.quantity) : null,
    currentPrice,
    priceDate: ledger.latest?.date ?? investment.createdAt,
    priceFromUpdate: ledger.latest?.fromUpdate ?? false,
    currentFx,
    valueNative,
    valueGBP,
    gainGBP,
    returnPct: ledger.costGBP.isPositive() ? gainGBP.dividedBy(ledger.costGBP).times(Decimal.HUNDRED) : null,
    realisedGBP: ledger.realisedGBP,
    dividendsGBP: ledger.dividendsGBP,
    feesGBP: ledger.feesGBP,
    totalBoughtGBP: ledger.totalBoughtGBP,
    totalReturnGBP,
    totalReturnPct: ledger.totalBoughtGBP.isPositive()
      ? totalReturnGBP.dividedBy(ledger.totalBoughtGBP).times(Decimal.HUNDRED)
      : null,
    entries: ledger.entries,
    problem: ledger.problem,
  };
}

export interface PortfolioHolding {
  investment: Investment;
  summary: HoldingSummary;
  /** Share of total portfolio value, as a percentage. Null when the portfolio is worth nothing. */
  sharePct: Decimal | null;
}

export interface PortfolioSummary {
  holdings: PortfolioHolding[];
  count: number;
  /** Holdings where every unit has been sold. */
  soldOutCount: number;
  valueGBP: Decimal;
  investedGBP: Decimal;
  /** Unrealised. */
  gainGBP: Decimal;
  returnPct: Decimal | null;
  realisedGBP: Decimal;
  dividendsGBP: Decimal;
  feesGBP: Decimal;
  totalBoughtGBP: Decimal;
  totalReturnGBP: Decimal;
  totalReturnPct: Decimal | null;
  /** True when any holding is priced in a currency other than GBP. */
  hasForeignCurrency: boolean;
  /** True once any sale has been recorded. */
  hasSales: boolean;
}

export function summarizePortfolio(investments: Investment[]): PortfolioSummary {
  const summaries = investments.map((investment) => ({ investment, summary: summarizeHolding(investment) }));
  const total = (pick: (s: HoldingSummary) => Decimal) => Decimal.sum(summaries.map(({ summary }) => pick(summary)));

  const valueGBP = total((s) => s.valueGBP);
  const investedGBP = total((s) => s.investedGBP);
  const gainGBP = valueGBP.minus(investedGBP);
  const totalBoughtGBP = total((s) => s.totalBoughtGBP);
  const totalReturnGBP = total((s) => s.totalReturnGBP);

  return {
    holdings: summaries.map(({ investment, summary }) => ({
      investment,
      summary,
      sharePct: valueGBP.isPositive() ? summary.valueGBP.dividedBy(valueGBP).times(Decimal.HUNDRED) : null,
    })),
    count: investments.length,
    soldOutCount: summaries.filter(({ summary }) => summary.quantity.isZero()).length,
    valueGBP,
    investedGBP,
    gainGBP,
    returnPct: investedGBP.isPositive() ? gainGBP.dividedBy(investedGBP).times(Decimal.HUNDRED) : null,
    realisedGBP: total((s) => s.realisedGBP),
    dividendsGBP: total((s) => s.dividendsGBP),
    feesGBP: total((s) => s.feesGBP),
    totalBoughtGBP,
    totalReturnGBP,
    totalReturnPct: totalBoughtGBP.isPositive() ? totalReturnGBP.dividedBy(totalBoughtGBP).times(Decimal.HUNDRED) : null,
    hasForeignCurrency: investments.some((investment) => investment.currency !== "GBP"),
    hasSales: investments.some((investment) => investment.transactions.some((t) => t.type === "sell")),
  };
}

/* ---------- Shared validation helpers ---------- */

/** Largest value accepted in any numeric field. */
const MAX_VALUE = Decimal.of("1000000000000");

interface NumberRule {
  required: boolean;
  /** "positive" means greater than zero. */
  min: "positive" | "zero";
  maxDecimals: number;
  what: string;
  example: string;
}

/** Returns an error message, or undefined when the text is valid. */
export function checkNumber(text: string, rule: NumberRule): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return rule.required ? `Enter ${rule.what}, for example ${rule.example}.` : undefined;
  const value = Decimal.parse(trimmed);
  if (!value) return `Enter ${rule.what} as a number, for example ${rule.example}.`;
  const decimals = (trimmed.replace(/[,\s£$€]/g, "").split(".")[1] ?? "").replace(/0+$/, "").length;
  if (decimals > rule.maxDecimals) {
    return `Use no more than ${rule.maxDecimals} decimal place${rule.maxDecimals === 1 ? "" : "s"}.`;
  }
  if (value.isNegative()) return `${capitalise(rule.what)} can't be negative.`;
  if (rule.min === "positive" && value.isZero()) return `${capitalise(rule.what)} must be more than zero.`;
  if (value.compare(MAX_VALUE) > 0) return `That's larger than Dream Vault can track.`;
  return undefined;
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const isISODate = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));

function checkDate(date: string, today: string, what: string): string | undefined {
  if (!date) return `Enter the date of the ${what}.`;
  if (!isISODate(date)) return "Enter a valid date.";
  if (date > today) return `The ${what} date can't be in the future.`;
  return undefined;
}

/** "3 Mar 2026" */
export function formatLedgerDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
}

/** Units without trailing zeros, e.g. "40" or "0.015". */
const unitsText = (value: Decimal) => value.toString();

/** Normalises user text ("1,250.50") to a stored decimal string ("1250.5"). */
const clean = (text: string, fallback = "0") => (text.trim() ? Decimal.of(text.trim()).toString() : fallback);

/* ---------- New investment form ---------- */

/** Everything the add/edit investment form collects, exactly as typed. */
export interface InvestmentDraft {
  name: string;
  ticker: string;
  category: CategoryId | "";
  account: string;
  currency: InvestmentCurrency;
  purchaseDate: string;
  quantity: string;
  purchasePrice: string;
  fees: string;
  purchaseFx: string;
  currentPrice: string;
  currentFx: string;
}

export type DraftErrors = Partial<Record<keyof InvestmentDraft, string>>;

export const EMPTY_DRAFT: InvestmentDraft = {
  name: "",
  ticker: "",
  category: "",
  account: "",
  currency: "GBP",
  purchaseDate: "",
  quantity: "",
  purchasePrice: "",
  fees: "",
  purchaseFx: "",
  currentPrice: "",
  currentFx: "",
};

/**
 * Validates the investment form. "create" checks everything; "details" checks only
 * name, ticker, category and account (used when editing an existing investment).
 */
export function validateDraft(draft: InvestmentDraft, today: string, mode: "create" | "details" = "create"): DraftErrors {
  const errors: DraftErrors = {};

  const name = draft.name.trim();
  if (!name) errors.name = "Enter a name, for example Vanguard FTSE Global All Cap.";
  else if (name.length > 60) errors.name = "Keep the name to 60 characters or fewer.";

  if (draft.ticker.trim() && !/^[A-Za-z0-9.:\-]{1,12}$/.test(draft.ticker.trim())) {
    errors.ticker = "Use up to 12 letters, numbers, dots, colons or dashes, for example VWRL or BRK.B.";
  }

  if (!CATEGORIES.some((category) => category.id === draft.category)) errors.category = "Choose a category.";
  if (draft.account.trim().length > 40) errors.account = "Keep the account name to 40 characters or fewer.";
  if (mode === "details") return errors;

  const foreign = draft.currency !== "GBP";
  if (!(draft.currency in INVESTMENT_CURRENCIES)) errors.currency = "Choose a currency.";

  const dateError = checkDate(draft.purchaseDate, today, "purchase");
  if (dateError) errors.purchaseDate = dateError;

  const checks: [keyof InvestmentDraft, NumberRule | null][] = [
    ["quantity", { required: true, min: "positive", maxDecimals: 8, what: "the number of units", example: "10 or 2.5" }],
    ["purchasePrice", { required: true, min: "positive", maxDecimals: 6, what: "the price per unit", example: "105.40" }],
    ["fees", { required: false, min: "zero", maxDecimals: 2, what: "the fees", example: "4.95" }],
    ["currentPrice", { required: true, min: "zero", maxDecimals: 6, what: "the current price per unit", example: "112.80" }],
    ["purchaseFx", foreign ? { required: true, min: "positive", maxDecimals: 6, what: "the exchange rate at purchase", example: "0.79" } : null],
    ["currentFx", foreign ? { required: true, min: "positive", maxDecimals: 6, what: "today's exchange rate", example: "0.78" } : null],
  ];
  for (const [field, rule] of checks) {
    if (!rule) continue;
    const error = checkNumber(String(draft[field]), rule);
    if (error) errors[field] = error;
  }

  return errors;
}

/** Builds a new investment from a valid draft: one purchase and one current-price entry. */
export function createInvestment(draft: InvestmentDraft, today: string, newId: () => string): Investment {
  const foreign = draft.currency !== "GBP";
  return {
    id: newId(),
    name: draft.name.trim(),
    ticker: draft.ticker.trim().toUpperCase(),
    category: draft.category as CategoryId,
    account: draft.account.trim(),
    currency: draft.currency,
    createdAt: today,
    transactions: [
      {
        id: newId(),
        type: "buy",
        date: draft.purchaseDate,
        quantity: clean(draft.quantity),
        price: clean(draft.purchasePrice),
        fees: clean(draft.fees),
        fxRate: foreign ? clean(draft.purchaseFx) : "1",
      },
      {
        id: newId(),
        type: "price",
        date: today,
        price: clean(draft.currentPrice),
        fxRate: foreign ? clean(draft.currentFx) : "1",
      },
    ],
  };
}

/** The form's starting values when editing an investment's details. */
export function draftFromInvestment(investment: Investment): InvestmentDraft {
  return {
    ...EMPTY_DRAFT,
    name: investment.name,
    ticker: investment.ticker,
    category: investment.category,
    account: investment.account,
    currency: investment.currency,
  };
}

/** Updates name, ticker, category and account. Transactions are edited one at a time. */
export function updateDetails(investment: Investment, draft: InvestmentDraft): Investment {
  return {
    ...investment,
    name: draft.name.trim(),
    ticker: draft.ticker.trim().toUpperCase(),
    category: draft.category as CategoryId,
    account: draft.account.trim(),
  };
}

/**
 * Records a manual price. A second update on the same date replaces the first,
 * so the price history keeps one entry per day.
 */
export function recordPrice(
  investment: Investment,
  update: { date: string; price: string; fxRate: string },
  newId: () => string,
): Investment {
  const fxRate = investment.currency === "GBP" ? "1" : clean(update.fxRate);
  const entry: PriceUpdate = { id: newId(), type: "price", date: update.date, price: clean(update.price), fxRate };
  const sameDay = investment.transactions.findIndex((t) => t.type === "price" && t.date === update.date);
  const transactions =
    sameDay === -1
      ? [...investment.transactions, entry]
      : investment.transactions.map((t, index) => (index === sameDay ? { ...entry, id: t.id } : t));
  return { ...investment, transactions };
}

/* ---------- Transactions: add, edit, delete safely ---------- */

/** Everything the transaction form collects, exactly as typed. Unused fields are ignored. */
export interface TransactionDraft {
  type: TransactionType;
  date: string;
  quantity: string;
  price: string;
  amount: string;
  fees: string;
  fxRate: string;
  note: string;
}

export type TransactionErrors = Partial<Record<keyof TransactionDraft | "history", string>>;

export function emptyTransactionDraft(type: TransactionType, today: string): TransactionDraft {
  return { type, date: today, quantity: "", price: "", amount: "", fees: "", fxRate: "", note: "" };
}

export function transactionToDraft(transaction: InvestmentTransaction): TransactionDraft {
  const base = { type: transaction.type, date: transaction.date, fxRate: transaction.fxRate, note: transaction.note ?? "" };
  switch (transaction.type) {
    case "buy":
    case "sell":
      return { ...base, quantity: transaction.quantity, price: transaction.price, amount: "", fees: transaction.fees === "0" ? "" : transaction.fees };
    case "dividend":
    case "fee":
      return { ...base, quantity: "", price: "", amount: transaction.amount, fees: "" };
    case "price":
      return { ...base, quantity: "", price: transaction.price, amount: "", fees: "" };
  }
}

/** Turns a valid draft into a stored transaction. */
export function buildTransaction(draft: TransactionDraft, currency: InvestmentCurrency, id: string): InvestmentTransaction {
  const base = {
    id,
    date: draft.date,
    fxRate: currency === "GBP" ? "1" : clean(draft.fxRate),
    ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
  };
  switch (draft.type) {
    case "buy":
    case "sell":
      return { ...base, type: draft.type, quantity: clean(draft.quantity), price: clean(draft.price), fees: clean(draft.fees) };
    case "dividend":
    case "fee":
      return { ...base, type: draft.type, amount: clean(draft.amount) };
    case "price":
      return { ...base, type: "price", price: clean(draft.price) };
  }
}

/** Replaces the transaction with the same id, or appends it. */
export function upsertTransaction(investment: Investment, transaction: InvestmentTransaction): Investment {
  const exists = investment.transactions.some((t) => t.id === transaction.id);
  return {
    ...investment,
    transactions: exists
      ? investment.transactions.map((t) => (t.id === transaction.id ? transaction : t))
      : [...investment.transactions, transaction],
  };
}

/** Units owned at the end of a given date (before any edit), for form hints. */
export function unitsOwnedOn(investment: Investment, date: string, excludingId?: string): Decimal {
  const without = { ...investment, transactions: investment.transactions.filter((t) => t.id !== excludingId) };
  let units = Decimal.ZERO;
  for (const entry of runLedger(without).entries) {
    if (entry.transaction.date > date) break;
    units = entry.unitsAfter;
  }
  return units;
}

/**
 * Validates a transaction draft, including whether the whole history still makes
 * sense with it in place (no sale may sell more units than were owned at the time).
 * Pass `editingId` when changing an existing transaction.
 */
export function validateTransaction(
  investment: Investment,
  draft: TransactionDraft,
  today: string,
  editingId?: string,
): TransactionErrors {
  const errors: TransactionErrors = {};
  const foreign = investment.currency !== "GBP";
  const what = TRANSACTION_LABELS[draft.type].toLowerCase();

  const dateError = checkDate(draft.date, today, what);
  if (dateError) errors.date = dateError;

  const rules: [keyof TransactionDraft, NumberRule][] = [];
  if (draft.type === "buy" || draft.type === "sell") {
    rules.push(["quantity", { required: true, min: "positive", maxDecimals: 8, what: "the number of units", example: "10 or 2.5" }]);
    rules.push(["price", { required: true, min: "positive", maxDecimals: 6, what: "the price per unit", example: "105.40" }]);
    rules.push(["fees", { required: false, min: "zero", maxDecimals: 2, what: "the fees", example: "4.95" }]);
  } else if (draft.type === "dividend") {
    rules.push(["amount", { required: true, min: "positive", maxDecimals: 2, what: "the dividend amount", example: "42.50" }]);
  } else if (draft.type === "fee") {
    rules.push(["amount", { required: true, min: "positive", maxDecimals: 2, what: "the fee amount", example: "3.00" }]);
  } else {
    rules.push(["price", { required: true, min: "zero", maxDecimals: 6, what: "the price per unit", example: "112.80" }]);
  }
  if (foreign) {
    rules.push(["fxRate", { required: true, min: "positive", maxDecimals: 6, what: "the exchange rate", example: "0.79" }]);
  }
  for (const [field, rule] of rules) {
    const error = checkNumber(draft[field], rule);
    if (error) errors[field] = error;
  }

  if (draft.note.trim().length > 80) errors.note = "Keep the note to 80 characters or fewer.";

  // Only purchases and sales change units. Check the history as soon as their date and
  // units make sense, even if the price is still blank, so an oversell is flagged early.
  const changesUnits = draft.type === "buy" || draft.type === "sell";
  if (!changesUnits || errors.date || errors.quantity) return errors;

  // Price, fees and rate don't affect units, so stand-ins are fine for this check.
  const unitsOnly: TransactionDraft = {
    ...draft,
    price: errors.price ? "1" : draft.price,
    fees: errors.fees ? "" : draft.fees,
    fxRate: errors.fxRate ? "1" : draft.fxRate,
    note: "",
  };
  const candidateId = editingId ?? "__candidate__";
  const candidate = upsertTransaction(investment, buildTransaction(unitsOnly, investment.currency, candidateId));

  if (editingId) {
    const original = investment.transactions.find((t) => t.id === editingId);
    const buysLeft = candidate.transactions.filter((t) => t.type === "buy").length;
    if (original?.type === "buy" && buysLeft === 0) {
      errors.type = "An investment needs at least one purchase.";
      return errors;
    }
  }

  const problem = runLedger(candidate).problem;
  if (problem) {
    if (problem.transactionId === candidateId) {
      errors.quantity = `On ${formatLedgerDate(problem.date)} you owned ${unitsText(problem.available)} units, so you can't sell ${unitsText(problem.attempted)}.`;
    } else {
      errors.history = `This would leave your sale on ${formatLedgerDate(problem.date)} selling ${unitsText(problem.attempted)} units when you'd only own ${unitsText(problem.available)}. Edit or delete that sale first.`;
    }
  }
  return errors;
}

/** Deletes a transaction, or explains why it can't be deleted. */
export function removeTransaction(
  investment: Investment,
  transactionId: string,
): { investment: Investment; error?: undefined } | { investment?: undefined; error: string } {
  const target = investment.transactions.find((t) => t.id === transactionId);
  if (!target) return { error: "That entry no longer exists." };

  const remaining = { ...investment, transactions: investment.transactions.filter((t) => t.id !== transactionId) };
  if (target.type === "buy" && !remaining.transactions.some((t) => t.type === "buy")) {
    return { error: "This is the only purchase. An investment needs at least one, so delete the whole investment instead." };
  }
  const problem = runLedger(remaining).problem;
  if (problem) {
    return {
      error: `Deleting this would leave your sale on ${formatLedgerDate(problem.date)} selling ${unitsText(problem.attempted)} units when you'd only own ${unitsText(problem.available)}. Edit or delete that sale first.`,
    };
  }
  return { investment: remaining };
}
