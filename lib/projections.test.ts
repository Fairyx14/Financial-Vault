/**
 * Planning-tool tests. Run with: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Decimal } from "./decimal.ts";
import { project, projectGoal, readNumber, RULES, type ProjectionInput } from "./projections.ts";

const D = (v: string | number) => Decimal.of(String(v));
const pounds = (v: Decimal) => v.toFixed(2);

const input = (overrides: Partial<ProjectionInput> = {}): ProjectionInput => ({
  start: D(0),
  monthly: D(0),
  annualReturnPct: D(0),
  years: 1,
  contributionIncreasePct: D(0),
  inflationPct: D(0),
  ...overrides,
});

describe("Growth projection", () => {
  it("with zero growth, the value is exactly what you put in", () => {
    const p = project(input({ start: D(1000), monthly: D(250), years: 10 }));
    assert.equal(pounds(p.finalValue), "31000.00");
    assert.equal(pounds(p.contributed), "31000.00");
    assert.ok(p.growth.isZero());
  });

  it("compounds a lump sum monthly", () => {
    // £1,000 at 12% a year = 1% a month for 12 months: 1000 × 1.01^12.
    const p = project(input({ start: D(1000), annualReturnPct: D(12) }));
    assert.equal(pounds(p.finalValue), "1126.83");
    assert.equal(pounds(p.growth), "126.83");
  });

  it("adds monthly contributions at the end of each month", () => {
    // £100 a month at 1% a month for 12 months: 100 × (1.01^12 − 1) ÷ 0.01.
    const p = project(input({ monthly: D(100), annualReturnPct: D(12) }));
    assert.equal(pounds(p.finalValue), "1268.25");
    assert.equal(pounds(p.contributed), "1200.00");
  });

  it("raises contributions once a year", () => {
    // Year 1: 12 × £100. Year 2: 12 × £110.
    const p = project(input({ monthly: D(100), years: 2, contributionIncreasePct: D(10) }));
    assert.equal(pounds(p.years[1].contributed), "1200.00");
    assert.equal(pounds(p.finalValue), "2520.00");
  });

  it("shrinks the balance with a negative return", () => {
    // −12% a year = −1% a month: 1000 × 0.99^12.
    const p = project(input({ start: D(1000), annualReturnPct: D(-12) }));
    assert.equal(pounds(p.finalValue), "886.38");
    assert.equal(pounds(p.growth), "-113.62");
  });

  it("shows values in today's money using inflation", () => {
    // £1,000 with no growth after 2 years at 10% inflation: 1000 ÷ 1.1².
    const p = project(input({ start: D(1000), years: 2, inflationPct: D(10) }));
    assert.equal(pounds(p.finalValue), "1000.00");
    assert.equal(pounds(p.realFinalValue), "826.45");
  });

  it("has one row per year, starting from today", () => {
    const p = project(input({ start: D(500), monthly: D(50), years: 5 }));
    assert.deepEqual(
      p.years.map((y) => y.year),
      [0, 1, 2, 3, 4, 5],
    );
    assert.equal(pounds(p.years[0].value), "500.00");
    assert.equal(pounds(p.years[3].contributed), "2300.00");
  });

  it("handles an empty plan", () => {
    const p = project(input({ years: 3 }));
    assert.ok(p.finalValue.isZero());
    assert.ok(p.growth.isZero());
  });
});

describe("Investment goals", () => {
  const goal = (current: number, target: number, monthly: number, pct: number) =>
    projectGoal({ current: D(current), target: D(target), monthly: D(monthly), annualReturnPct: D(pct) });

  it("counts months to the target with no growth", () => {
    const g = goal(10000, 100000, 1000, 0);
    assert.equal(g.status, "reachable");
    assert.equal(g.months, 90);
    assert.equal(g.progressPct.toFixed(0), "10");
  });

  it("finds each milestone", () => {
    const g = goal(0, 1200, 100, 0);
    assert.deepEqual(
      g.milestones.map((m) => m.months),
      [3, 6, 9, 12],
    );
  });

  it("marks milestones already passed as reached", () => {
    const g = goal(600, 1200, 100, 0);
    assert.deepEqual(
      g.milestones.map((m) => m.months),
      [0, 0, 3, 6],
    );
  });

  it("gets there sooner with growth", () => {
    assert.ok(goal(10000, 100000, 1000, 6).months! < 90);
  });

  it("recognises a goal that's already reached", () => {
    const g = goal(120000, 100000, 0, 0);
    assert.equal(g.status, "reached");
    assert.equal(g.progressPct.toFixed(0), "100");
  });

  it("explains when nothing can make the balance grow", () => {
    const g = goal(5000, 100000, 0, 0);
    assert.equal(g.status, "unreachable");
    assert.equal(g.reason, "no-growth");
    assert.equal(g.months, null);
  });

  it("explains when a negative return levels the balance off below the target", () => {
    // −12% a year (−1% a month) with £500 a month settles at £50,000.
    const g = goal(10000, 100000, 500, -12);
    assert.equal(g.reason, "levels-off");
    assert.equal(pounds(g.ceiling!), "50000.00");
    // The balance still climbs from £10,000 towards £50,000, so the 25% milestone (£25,000) is reachable.
    assert.ok(g.milestones[0].months! > 0);
    assert.equal(g.milestones[1].months, null, "£50,000 is approached but never quite reached");
  });

  it("can still reach a target below the level-off point with a negative return", () => {
    const g = goal(10000, 20000, 500, -12);
    assert.equal(g.status, "reachable");
    assert.ok(g.months! > 20, "slower than the 20 months it would take with no losses");
  });

  it("gives up after 100 years", () => {
    const g = goal(0, 1_000_000_000, 1, 0);
    assert.equal(g.reason, "too-long");
  });
});

describe("Input checks", () => {
  it("accepts valid numbers and treats blank optional fields as zero", () => {
    assert.equal(readNumber("1,500.50", { what: "the amount", required: true, ...RULES.amount }).value?.toString(), "1500.5");
    assert.equal(readNumber("", { what: "inflation", required: false, ...RULES.inflationPct }).value?.toString(), "0");
  });

  it("explains invalid values", () => {
    assert.match(readNumber("", { what: "the amount", required: true, ...RULES.amount }).error ?? "", /Enter the amount/);
    assert.match(readNumber("abc", { what: "the amount", required: true, ...RULES.amount }).error ?? "", /as a number/);
    assert.match(readNumber("2.5", { what: "the number of years", required: true, ...RULES.years }).error ?? "", /whole number/);
    assert.match(readNumber("75", { what: "the return", required: true, ...RULES.returnPct }).error ?? "", /between -50 and 50/);
    assert.match(readNumber("-1", { what: "the amount", required: true, ...RULES.amount }).error ?? "", /between 0/);
  });

  it("allows negative returns within range", () => {
    assert.equal(readNumber("-8", { what: "the return", required: true, ...RULES.returnPct }).value?.toString(), "-8");
  });
});
