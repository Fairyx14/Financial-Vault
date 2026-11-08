/**
 * Chart data tests. Run with: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocationByCategory,
  holdingBars,
  portfolioHistory,
  priceHistory,
} from "./investmentCharts.ts";
import { Decimal } from "./decimal.ts";
import { summarizePortfolio, type Investment, type InvestmentTransaction } from "./investments.ts";

const pounds = (value: Decimal) => value.toFixed(2);

function holding(id: string, category: Investment["category"], transactions: InvestmentTransaction[]): Investment {
  return { id, name: id, ticker: "", category, account: "", currency: "GBP", createdAt: "2026-01-01", transactions };
}

const buy = (id: string, date: string, quantity: string, price: string) =>
  ({ id, type: "buy", date, quantity, price, fees: "0", fxRate: "1" }) as const;
const sell = (id: string, date: string, quantity: string, price: string) =>
  ({ id, type: "sell", date, quantity, price, fees: "0", fxRate: "1" }) as const;
const price = (id: string, date: string, value: string) => ({ id, type: "price", date, price: value, fxRate: "1" }) as const;

describe("Portfolio value over time", () => {
  it("is empty for an empty portfolio", () => {
    assert.deepEqual(portfolioHistory([]), []);
  });

  it("only has points on dates you recorded a price", () => {
    const a = holding("a", "etfs", [buy("b1", "2026-01-10", "10", "100"), price("p1", "2026-03-01", "110")]);
    const history = portfolioHistory([a]);
    assert.deepEqual(
      history.map((p) => p.date),
      ["2026-01-10", "2026-03-01"],
    );
    assert.equal(pounds(history[0].valueGBP), "1000.00");
    assert.equal(pounds(history[1].valueGBP), "1100.00");
    assert.equal(pounds(history[1].investedGBP), "1000.00");
  });

  it("ignores dividends and fees, which don't change market value", () => {
    const a = holding("a", "etfs", [
      buy("b1", "2026-01-10", "10", "100"),
      { id: "d1", type: "dividend", date: "2026-02-01", amount: "5", fxRate: "1" },
      { id: "f1", type: "fee", date: "2026-02-15", amount: "1", fxRate: "1" },
    ]);
    assert.deepEqual(
      portfolioHistory([a]).map((p) => p.date),
      ["2026-01-10"],
    );
  });

  it("carries a holding's last price forward and counts how many were carried", () => {
    const a = holding("a", "etfs", [buy("b1", "2026-01-10", "10", "100")]);
    const b = holding("b", "stocks", [buy("b2", "2026-02-01", "5", "20"), price("p2", "2026-03-01", "30")]);
    const history = portfolioHistory([a, b]);
    // 1 Mar: a still at £100 (carried), b at £30.
    const march = history.find((p) => p.date === "2026-03-01")!;
    assert.equal(pounds(march.valueGBP), "1150.00");
    assert.equal(march.carriedForward, 1);
    // 10 Jan: b not bought yet, so only a counts.
    assert.equal(pounds(history[0].valueGBP), "1000.00");
    assert.equal(history[0].carriedForward, 0);
  });

  it("drops value and invested capital when units are sold", () => {
    const a = holding("a", "etfs", [buy("b1", "2026-01-10", "10", "100"), sell("s1", "2026-04-01", "10", "120")]);
    const last = portfolioHistory([a]).at(-1)!;
    assert.ok(last.valueGBP.isZero());
    assert.ok(last.investedGBP.isZero());
    assert.equal(last.carriedForward, 0, "a sold-out holding isn't counted as carried forward");
  });

  it("never adds points after the last recorded date", () => {
    const a = holding("a", "etfs", [buy("b1", "2026-01-10", "10", "100")]);
    assert.equal(portfolioHistory([a]).length, 1);
  });
});

describe("Price history", () => {
  it("lists recorded prices in order, keeping the last entry on a date", () => {
    const a = holding("a", "etfs", [
      buy("b1", "2026-01-10", "10", "100"),
      price("p1", "2026-01-10", "101"),
      price("p2", "2026-02-10", "104.5"),
    ]);
    const prices = priceHistory(a);
    assert.deepEqual(
      prices.map((p) => `${p.date} ${p.price.toString()} ${p.source}`),
      ["2026-01-10 101 update", "2026-02-10 104.5 update"],
    );
  });
});

describe("Asset allocation", () => {
  const portfolio = () =>
    summarizePortfolio([
      holding("a", "etfs", [buy("b1", "2026-01-10", "10", "100"), price("p1", "2026-02-01", "150")]), // value 1500, invested 1000
      holding("b", "stocks", [buy("b2", "2026-01-10", "10", "50")]), // value 500, invested 500
      holding("c", "crypto", [buy("b3", "2026-01-10", "1", "100"), sell("s3", "2026-02-01", "1", "90")]), // sold out
    ]);

  it("splits current value by category and leaves out empty ones", () => {
    const slices = allocationByCategory(portfolio(), "value");
    assert.deepEqual(
      slices.map((s) => `${s.label} ${s.pct.toFixed(1)}`),
      ["Stocks 25.0", "ETFs 75.0"],
    );
  });

  it("can split by amount invested instead", () => {
    const slices = allocationByCategory(portfolio(), "invested");
    assert.deepEqual(
      slices.map((s) => `${s.label} ${s.pct.toFixed(2)}`),
      ["Stocks 33.33", "ETFs 66.67"],
    );
  });

  it("adds up to 100%", () => {
    const total = Decimal.sum(allocationByCategory(portfolio(), "invested").map((s) => s.pct));
    assert.equal(total.toFixed(6), "100.000000");
  });

  it("is empty when nothing is held", () => {
    assert.deepEqual(allocationByCategory(summarizePortfolio([]), "value"), []);
  });
});

describe("Holdings comparison", () => {
  it("orders holdings by value and leaves out fully sold ones", () => {
    const bars = holdingBars(
      summarizePortfolio([
        holding("small", "etfs", [buy("b1", "2026-01-10", "1", "100")]),
        holding("big", "etfs", [buy("b2", "2026-01-10", "10", "100"), price("p2", "2026-02-01", "90")]),
        holding("gone", "etfs", [buy("b3", "2026-01-10", "1", "100"), sell("s3", "2026-02-01", "1", "100")]),
      ]),
    );
    assert.deepEqual(
      bars.map((b) => b.name),
      ["big", "small"],
    );
    assert.equal(pounds(bars[0].gainGBP), "-100.00");
  });
});
