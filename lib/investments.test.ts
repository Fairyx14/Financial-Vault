/**
 * Investment Vault calculation tests. Run with: npm test
 * Uses Node's built-in test runner, so no extra packages are needed.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Decimal } from "./decimal.ts";
import {
  buildTransaction,
  createInvestment,
  emptyTransactionDraft,
  EMPTY_DRAFT,
  recordPrice,
  removeTransaction,
  summarizeHolding,
  summarizePortfolio,
  unitsOwnedOn,
  updateDetails,
  upsertTransaction,
  validateDraft,
  validateTransaction,
  type Investment,
  type InvestmentDraft,
  type TransactionDraft,
} from "./investments.ts";

const TODAY = "2026-11-08";

/** Predictable ids so tests are repeatable. */
const ids = () => {
  let n = 0;
  return () => `id-${++n}`;
};

const draft = (overrides: Partial<InvestmentDraft> = {}): InvestmentDraft => ({
  ...EMPTY_DRAFT,
  name: "Global tracker",
  category: "index-funds",
  purchaseDate: "2026-01-15",
  quantity: "100",
  purchasePrice: "140",
  currentPrice: "158",
  ...overrides,
});

/** Money as a 2-decimal string, the way it's displayed. */
const pounds = (value: Decimal) => value.toFixed(2);

describe("Decimal", () => {
  it("adds without floating-point drift", () => {
    assert.equal(Decimal.of("0.1").plus(Decimal.of("0.2")).toString(), "0.3");
  });

  it("parses user text with commas and currency symbols", () => {
    assert.equal(Decimal.parse("£1,250.50")?.toString(), "1250.5");
  });

  it("rejects text that isn't a plain number", () => {
    for (const bad of ["", "abc", "1e5", "1.2.3", "--4", "."]) assert.equal(Decimal.parse(bad), null, bad);
  });

  it("rounds half away from zero when displayed", () => {
    assert.equal(Decimal.of("2.345").toFixed(2), "2.35");
    assert.equal(Decimal.of("-2.345").toFixed(2), "-2.35");
  });
});

describe("Holding calculations", () => {
  it("values a single GBP purchase", () => {
    const summary = summarizeHolding(createInvestment(draft(), TODAY, ids()));
    assert.equal(summary.quantity.toString(), "100");
    assert.equal(pounds(summary.investedGBP), "14000.00");
    assert.equal(pounds(summary.valueGBP), "15800.00");
    assert.equal(pounds(summary.gainGBP), "1800.00");
    assert.equal(summary.returnPct?.toFixed(2), "12.86");
  });

  it("includes fees in the amount invested and the average cost", () => {
    const summary = summarizeHolding(createInvestment(draft({ fees: "9.99" }), TODAY, ids()));
    assert.equal(pounds(summary.investedGBP), "14009.99");
    assert.equal(summary.averageCost?.toFixed(4), "140.0999");
    assert.equal(pounds(summary.gainGBP), "1790.01");
  });

  it("averages the cost across multiple purchases of the same asset", () => {
    const investment = createInvestment(draft({ quantity: "10", purchasePrice: "100", currentPrice: "130" }), TODAY, ids());
    investment.transactions.push({
      id: "second-buy",
      type: "buy",
      date: "2026-03-01",
      quantity: "30",
      price: "120",
      fees: "0",
      fxRate: "1",
    });
    const summary = summarizeHolding(investment);
    // (10 × 100 + 30 × 120) ÷ 40 = 4600 ÷ 40 = 115
    assert.equal(summary.quantity.toString(), "40");
    assert.equal(pounds(summary.investedGBP), "4600.00");
    assert.equal(summary.averageCost?.toString(), "115");
    assert.equal(pounds(summary.valueGBP), "5200.00");
    assert.equal(pounds(summary.gainGBP), "600.00");
  });

  it("handles fractional units exactly (e.g. crypto)", () => {
    const summary = summarizeHolding(
      createInvestment(
        draft({ category: "crypto", quantity: "0.00012345", purchasePrice: "52000", currentPrice: "48000.5" }),
        TODAY,
        ids(),
      ),
    );
    assert.equal(summary.investedGBP.toString(), "6.4194");
    assert.equal(summary.valueGBP.toString(), "5.925661725");
  });

  it("reports a zero return when the price hasn't moved", () => {
    const summary = summarizeHolding(createInvestment(draft({ currentPrice: "140" }), TODAY, ids()));
    assert.ok(summary.gainGBP.isZero());
    assert.equal(summary.returnPct?.toFixed(2), "0.00");
  });

  it("reports negative returns as losses", () => {
    const summary = summarizeHolding(createInvestment(draft({ currentPrice: "112" }), TODAY, ids()));
    assert.equal(pounds(summary.gainGBP), "-2800.00");
    assert.equal(summary.returnPct?.toFixed(2), "-20.00");
  });

  it("handles a price that falls to zero", () => {
    const summary = summarizeHolding(createInvestment(draft({ currentPrice: "0" }), TODAY, ids()));
    assert.ok(summary.valueGBP.isZero());
    assert.equal(summary.returnPct?.toFixed(2), "-100.00");
  });

  it("converts foreign holdings using the purchase rate for cost and today's rate for value", () => {
    const summary = summarizeHolding(
      createInvestment(
        draft({ currency: "USD", quantity: "10", purchasePrice: "200", purchaseFx: "0.8", currentPrice: "220", currentFx: "0.75" }),
        TODAY,
        ids(),
      ),
    );
    // Cost: 10 × $200 = $2,000 × 0.80 = £1,600. Value: 10 × $220 = $2,200 × 0.75 = £1,650.
    assert.equal(pounds(summary.investedNative), "2000.00");
    assert.equal(pounds(summary.investedGBP), "1600.00");
    assert.equal(pounds(summary.valueNative), "2200.00");
    assert.equal(pounds(summary.valueGBP), "1650.00");
    assert.equal(pounds(summary.gainGBP), "50.00");
  });
});

describe("Price updates", () => {
  it("uses the most recent price", () => {
    let investment = createInvestment(draft(), TODAY, ids());
    investment = recordPrice(investment, { date: "2026-11-09", price: "160", fxRate: "1" }, ids());
    assert.equal(summarizeHolding(investment).currentPrice.toString(), "160");
  });

  it("replaces an earlier update on the same day instead of duplicating it", () => {
    let investment = createInvestment(draft(), TODAY, ids());
    investment = recordPrice(investment, { date: TODAY, price: "150", fxRate: "1" }, ids());
    const priceEntries = investment.transactions.filter((t) => t.type === "price");
    assert.equal(priceEntries.length, 1);
    assert.equal(summarizeHolding(investment).currentPrice.toString(), "150");
  });

  it("editing details leaves the transactions and figures untouched", () => {
    const investment = createInvestment(draft(), TODAY, ids());
    const renamed = updateDetails(investment, draft({ name: "Renamed", ticker: "vwrl", category: "etfs" }));
    assert.equal(renamed.name, "Renamed");
    assert.equal(renamed.ticker, "VWRL");
    assert.equal(renamed.category, "etfs");
    assert.deepEqual(renamed.transactions, investment.transactions);
  });
});

describe("Portfolio totals", () => {
  it("is all zeros for an empty portfolio, with no return percentage", () => {
    const portfolio = summarizePortfolio([]);
    assert.equal(portfolio.count, 0);
    assert.ok(portfolio.valueGBP.isZero());
    assert.ok(portfolio.investedGBP.isZero());
    assert.equal(portfolio.returnPct, null);
  });

  it("adds holdings together and works out each one's share", () => {
    const make = (overrides: Partial<InvestmentDraft>) => createInvestment(draft(overrides), TODAY, ids());
    const holdings: Investment[] = [
      make({ quantity: "100", purchasePrice: "100", currentPrice: "120" }), // £10,000 → £12,000
      make({ quantity: "50", purchasePrice: "80", currentPrice: "64" }), // £4,000 → £3,200
    ];
    const portfolio = summarizePortfolio(holdings);
    assert.equal(pounds(portfolio.investedGBP), "14000.00");
    assert.equal(pounds(portfolio.valueGBP), "15200.00");
    assert.equal(pounds(portfolio.gainGBP), "1200.00");
    assert.equal(portfolio.returnPct?.toFixed(2), "8.57");
    assert.equal(portfolio.holdings[0].sharePct?.toFixed(2), "78.95");
    assert.equal(portfolio.holdings[1].sharePct?.toFixed(2), "21.05");
    assert.equal(portfolio.hasForeignCurrency, false);
  });

  it("totals mixed-currency holdings in GBP", () => {
    const portfolio = summarizePortfolio([
      createInvestment(draft({ quantity: "10", purchasePrice: "100", currentPrice: "100" }), TODAY, ids()),
      createInvestment(
        draft({ currency: "EUR", quantity: "10", purchasePrice: "100", purchaseFx: "0.85", currentPrice: "100", currentFx: "0.85" }),
        TODAY,
        ids(),
      ),
    ]);
    assert.equal(pounds(portfolio.valueGBP), "1850.00");
    assert.equal(portfolio.hasForeignCurrency, true);
  });
});

describe("Validation", () => {
  it("accepts a complete GBP draft", () => {
    assert.deepEqual(validateDraft(draft(), TODAY), {});
  });

  it("requires the essential fields", () => {
    const errors = validateDraft(EMPTY_DRAFT, TODAY);
    for (const field of ["name", "category", "purchaseDate", "quantity", "purchasePrice", "currentPrice"]) {
      assert.ok(errors[field as keyof typeof errors], `${field} should be required`);
    }
    assert.equal(errors.fees, undefined, "fees are optional");
  });

  it("rejects zero, negative and non-numeric amounts", () => {
    const errors = validateDraft(draft({ quantity: "0", purchasePrice: "-5", currentPrice: "abc", fees: "-1" }), TODAY);
    assert.match(errors.quantity ?? "", /more than zero/);
    assert.match(errors.purchasePrice ?? "", /negative/);
    assert.match(errors.currentPrice ?? "", /as a number/);
    assert.match(errors.fees ?? "", /negative/);
  });

  it("allows a current price of zero", () => {
    assert.equal(validateDraft(draft({ currentPrice: "0" }), TODAY).currentPrice, undefined);
  });

  it("limits decimal places", () => {
    const errors = validateDraft(draft({ fees: "1.999", quantity: "0.123456789" }), TODAY);
    assert.match(errors.fees ?? "", /2 decimal places/);
    assert.match(errors.quantity ?? "", /8 decimal places/);
  });

  it("rejects purchase dates in the future", () => {
    assert.match(validateDraft(draft({ purchaseDate: "2026-11-09" }), TODAY).purchaseDate ?? "", /future/);
  });

  it("requires both exchange rates for non-GBP investments", () => {
    const errors = validateDraft(draft({ currency: "USD" }), TODAY);
    assert.ok(errors.purchaseFx);
    assert.ok(errors.currentFx);
    assert.equal(validateDraft(draft(), TODAY).purchaseFx, undefined, "not needed for GBP");
  });

  it("checks the ticker format", () => {
    assert.ok(validateDraft(draft({ ticker: "not a ticker!" }), TODAY).ticker);
    assert.equal(validateDraft(draft({ ticker: "BRK.B" }), TODAY).ticker, undefined);
  });

  it("checks only the details when editing an existing investment", () => {
    assert.deepEqual(validateDraft(draft({ quantity: "", currentPrice: "" }), TODAY, "details"), {});
    assert.ok(validateDraft(draft({ name: "" }), TODAY, "details").name);
  });
});

/* =========================================================
   Phase 2: sales, dividends, fees and safe editing
   ========================================================= */

/** A transaction draft with sensible defaults. */
const tx = (type: TransactionDraft["type"], fields: Partial<TransactionDraft> = {}): TransactionDraft => ({
  ...emptyTransactionDraft(type, TODAY),
  ...fields,
});

/** Validates a transaction (asserting it's allowed) and applies it. */
let txCounter = 0;
function apply(investment: Investment, draftTx: TransactionDraft, editingId?: string): Investment {
  assert.deepEqual(validateTransaction(investment, draftTx, TODAY, editingId), {});
  return upsertTransaction(investment, buildTransaction(draftTx, investment.currency, editingId ?? `tx-${++txCounter}`));
}

/** 100 units at £10 with £10 fees on 10 Jan (cost £1,010, £10.10 a unit); priced at £12 today. */
const pool = () =>
  createInvestment(
    draft({ purchaseDate: "2026-01-10", quantity: "100", purchasePrice: "10", fees: "10", currentPrice: "12" }),
    TODAY,
    ids(),
  );

describe("Sales and cost basis (pooled average cost)", () => {
  it("removes a proportional share of cost on a partial sale", () => {
    const investment = apply(pool(), tx("sell", { date: "2026-06-01", quantity: "40", price: "15", fees: "5" }));
    const s = summarizeHolding(investment);
    // Proceeds 40 × £15 − £5 = £595. Cost removed 40% × £1,010 = £404. Realised £191.
    assert.equal(pounds(s.realisedGBP), "191.00");
    assert.equal(s.quantity.toString(), "60");
    assert.equal(pounds(s.investedGBP), "606.00");
    assert.equal(s.averageCost?.toFixed(2), "10.10", "average cost doesn't change on a sale");
    // Unrealised: 60 × £12 = £720 − £606 = £114.
    assert.equal(pounds(s.valueGBP), "720.00");
    assert.equal(pounds(s.gainGBP), "114.00");
    // Total return £305 on £1,010 ever invested.
    assert.equal(pounds(s.totalReturnGBP), "305.00");
    assert.equal(s.totalReturnPct?.toFixed(2), "30.20");
  });

  it("doesn't treat the whole sale as profit", () => {
    const investment = apply(pool(), tx("sell", { date: "2026-06-01", quantity: "50", price: "10.10" }));
    // Selling at exactly the average cost returns your money with no gain.
    assert.ok(summarizeHolding(investment).realisedGBP.isZero());
  });

  it("averages multiple purchases before a partial sale", () => {
    let investment = createInvestment(
      draft({ purchaseDate: "2026-01-10", quantity: "10", purchasePrice: "100", currentPrice: "130" }),
      TODAY,
      ids(),
    );
    investment = apply(investment, tx("buy", { date: "2026-02-10", quantity: "30", price: "120" }));
    investment = apply(investment, tx("sell", { date: "2026-03-10", quantity: "20", price: "130" }));
    const s = summarizeHolding(investment);
    // Pool: 40 units costing £4,600 (£115 each). Selling 20 removes £2,300; proceeds £2,600.
    assert.equal(pounds(s.realisedGBP), "300.00");
    assert.equal(s.quantity.toString(), "20");
    assert.equal(s.averageCost?.toString(), "115");
    assert.equal(pounds(s.investedGBP), "2300.00");
  });

  it("records a realised loss when selling below cost", () => {
    const investment = apply(pool(), tx("sell", { date: "2026-06-01", quantity: "100", price: "8" }));
    assert.equal(pounds(summarizeHolding(investment).realisedGBP), "-210.00");
  });

  it("empties the pool exactly when everything is sold", () => {
    const investment = apply(pool(), tx("sell", { date: "2026-06-01", quantity: "100", price: "13", fees: "7" }));
    const s = summarizeHolding(investment);
    assert.ok(s.quantity.isZero());
    assert.ok(s.investedGBP.isZero());
    assert.ok(s.valueGBP.isZero());
    assert.equal(s.averageCost, null);
    assert.equal(s.returnPct, null, "no unrealised return on nothing held");
    // £1,300 − £7 − £1,010 = £283.
    assert.equal(pounds(s.realisedGBP), "283.00");
  });

  it("starts a fresh average after selling out and buying again", () => {
    let investment = pool();
    investment = apply(investment, tx("sell", { date: "2026-03-01", quantity: "100", price: "12" }));
    investment = apply(investment, tx("buy", { date: "2026-04-01", quantity: "50", price: "20" }));
    const s = summarizeHolding(investment);
    assert.equal(s.averageCost?.toString(), "20");
    assert.equal(pounds(s.realisedGBP), "190.00");
  });

  it("converts sale proceeds at the sale's own exchange rate", () => {
    let investment = createInvestment(
      draft({ currency: "USD", purchaseDate: "2026-01-10", quantity: "10", purchasePrice: "100", purchaseFx: "0.8", currentPrice: "120", currentFx: "0.75" }),
      TODAY,
      ids(),
    );
    investment = apply(investment, tx("sell", { date: "2026-05-01", quantity: "5", price: "120", fxRate: "0.75" }));
    // Proceeds $600 × 0.75 = £450. Cost removed: half of £800 = £400. Realised £50.
    assert.equal(pounds(summarizeHolding(investment).realisedGBP), "50.00");
  });
});

describe("Dividends and fees", () => {
  it("tracks dividends separately from capital gains", () => {
    const before = summarizeHolding(pool());
    const after = summarizeHolding(apply(pool(), tx("dividend", { date: "2026-07-01", amount: "25.50" })));
    assert.equal(pounds(after.dividendsGBP), "25.50");
    assert.equal(pounds(after.investedGBP), pounds(before.investedGBP), "cost is unchanged");
    assert.equal(pounds(after.gainGBP), pounds(before.gainGBP), "unrealised gain is unchanged");
    assert.ok(after.realisedGBP.isZero(), "a dividend is not a realised gain");
    // Total return: unrealised £190 + dividend £25.50.
    assert.equal(pounds(after.totalReturnGBP), "215.50");
  });

  it("subtracts standalone fees from total return only", () => {
    const s = summarizeHolding(apply(pool(), tx("fee", { date: "2026-07-01", amount: "4.99", note: "Platform fee" })));
    assert.equal(pounds(s.feesGBP), "4.99");
    assert.equal(pounds(s.investedGBP), "1010.00");
    assert.equal(pounds(s.totalReturnGBP), "185.01");
  });

  it("keeps a trimmed note", () => {
    const built = buildTransaction(tx("dividend", { amount: "10", note: "  Q3 payout " }), "GBP", "d1");
    assert.equal(built.note, "Q3 payout");
  });
});

describe("Preventing impossible histories", () => {
  it("won't sell more units than are owned", () => {
    const errors = validateTransaction(pool(), tx("sell", { date: "2026-06-01", quantity: "101", price: "12" }), TODAY);
    assert.match(errors.quantity ?? "", /owned 100 units/);
  });

  it("flags an oversell as soon as the date and units are entered, before the price", () => {
    const errors = validateTransaction(pool(), tx("sell", { date: "2026-06-01", quantity: "101", price: "" }), TODAY);
    assert.match(errors.quantity ?? "", /owned 100 units/);
    assert.ok(errors.price, "the missing price is still reported");
  });

  it("won't sell before the units were bought", () => {
    const errors = validateTransaction(pool(), tx("sell", { date: "2026-01-05", quantity: "1", price: "12" }), TODAY);
    assert.match(errors.quantity ?? "", /owned 0 units/);
  });

  it("checks units owned on the sale date, not today", () => {
    let investment = pool();
    investment = apply(investment, tx("buy", { date: "2026-09-01", quantity: "50", price: "11" }));
    // 150 owned today, but only 100 on 1 June.
    const errors = validateTransaction(investment, tx("sell", { date: "2026-06-01", quantity: "120", price: "12" }), TODAY);
    assert.match(errors.quantity ?? "", /owned 100 units/);
    assert.equal(unitsOwnedOn(investment, "2026-06-01").toString(), "100");
    assert.equal(unitsOwnedOn(investment, TODAY).toString(), "150");
  });

  it("won't let an edited purchase break a later sale", () => {
    let investment = pool();
    investment = apply(investment, tx("sell", { date: "2026-06-01", quantity: "80", price: "12" }));
    const buyId = investment.transactions.find((t) => t.type === "buy")!.id;
    const errors = validateTransaction(investment, tx("buy", { date: "2026-01-10", quantity: "50", price: "10" }), TODAY, buyId);
    assert.match(errors.history ?? "", /sale on 1 Jun 2026/);
  });

  it("won't let a sale be moved to before the purchase", () => {
    let investment = pool();
    investment = apply(investment, tx("sell", { date: "2026-06-01", quantity: "10", price: "12" }));
    const saleId = investment.transactions.find((t) => t.type === "sell")!.id;
    const errors = validateTransaction(investment, tx("sell", { date: "2026-01-01", quantity: "10", price: "12" }), TODAY, saleId);
    assert.ok(errors.quantity);
  });

  it("recalculates when a sale is edited", () => {
    let investment = pool();
    investment = apply(investment, tx("sell", { date: "2026-06-01", quantity: "50", price: "12" }));
    const saleId = investment.transactions.find((t) => t.type === "sell")!.id;
    investment = apply(investment, tx("sell", { date: "2026-06-01", quantity: "50", price: "14" }), saleId);
    // Proceeds £700 − half of £1,010 (£505) = £195.
    assert.equal(pounds(summarizeHolding(investment).realisedGBP), "195.00");
    assert.equal(investment.transactions.filter((t) => t.type === "sell").length, 1);
  });

  it("won't delete a purchase that a later sale depends on", () => {
    let investment = pool();
    investment = apply(investment, tx("buy", { date: "2026-02-01", quantity: "50", price: "10" }));
    investment = apply(investment, tx("sell", { date: "2026-06-01", quantity: "120", price: "12" }));
    const secondBuy = investment.transactions.filter((t) => t.type === "buy")[1];
    const result = removeTransaction(investment, secondBuy.id);
    assert.match(result.error ?? "", /sale on 1 Jun 2026/);
  });

  it("deletes a sale and puts the units back", () => {
    let investment = pool();
    investment = apply(investment, tx("sell", { date: "2026-06-01", quantity: "40", price: "15" }));
    const saleId = investment.transactions.find((t) => t.type === "sell")!.id;
    const result = removeTransaction(investment, saleId);
    assert.ok(result.investment);
    const s = summarizeHolding(result.investment);
    assert.equal(s.quantity.toString(), "100");
    assert.ok(s.realisedGBP.isZero());
  });

  it("won't delete the only purchase", () => {
    const investment = pool();
    const buyId = investment.transactions.find((t) => t.type === "buy")!.id;
    assert.match(removeTransaction(investment, buyId).error ?? "", /only purchase/);
  });
});

describe("Transaction validation", () => {
  it("requires a positive dividend or fee amount", () => {
    assert.match(validateTransaction(pool(), tx("dividend", { amount: "0" }), TODAY).amount ?? "", /more than zero/);
    assert.match(validateTransaction(pool(), tx("fee", { amount: "-3" }), TODAY).amount ?? "", /negative/);
    assert.match(validateTransaction(pool(), tx("dividend", { amount: "1.234" }), TODAY).amount ?? "", /2 decimal places/);
  });

  it("allows a price update of zero but not a negative one", () => {
    assert.deepEqual(validateTransaction(pool(), tx("price", { price: "0" }), TODAY), {});
    assert.ok(validateTransaction(pool(), tx("price", { price: "-1" }), TODAY).price);
  });

  it("rejects future dates and over-long notes", () => {
    const errors = validateTransaction(pool(), tx("dividend", { date: "2026-12-01", amount: "5", note: "x".repeat(81) }), TODAY);
    assert.match(errors.date ?? "", /future/);
    assert.match(errors.note ?? "", /80 characters/);
  });

  it("requires an exchange rate for non-GBP investments", () => {
    const usd = createInvestment(draft({ currency: "USD", purchaseFx: "0.8", currentFx: "0.8" }), TODAY, ids());
    assert.ok(validateTransaction(usd, tx("dividend", { amount: "5" }), TODAY).fxRate);
    assert.equal(validateTransaction(pool(), tx("dividend", { amount: "5" }), TODAY).fxRate, undefined);
  });
});

describe("Portfolio totals with sales and income", () => {
  it("adds realised gains, dividends and fees into the total return", () => {
    let a = pool();
    a = apply(a, tx("sell", { date: "2026-06-01", quantity: "40", price: "15", fees: "5" })); // realised £191, unrealised £114
    a = apply(a, tx("dividend", { date: "2026-07-01", amount: "20" }));
    let b = pool();
    b = apply(b, tx("sell", { date: "2026-06-01", quantity: "100", price: "11" })); // realised £90, sold out
    b = apply(b, tx("fee", { date: "2026-07-01", amount: "10" }));

    const portfolio = summarizePortfolio([a, b]);
    assert.equal(pounds(portfolio.realisedGBP), "281.00");
    assert.equal(pounds(portfolio.dividendsGBP), "20.00");
    assert.equal(pounds(portfolio.feesGBP), "10.00");
    assert.equal(pounds(portfolio.gainGBP), "114.00");
    // 114 + 281 + 20 − 10 = 405 on £2,020 ever invested.
    assert.equal(pounds(portfolio.totalReturnGBP), "405.00");
    assert.equal(portfolio.totalReturnPct?.toFixed(2), "20.05");
    assert.equal(portfolio.soldOutCount, 1);
    assert.equal(portfolio.hasSales, true);
  });
});
