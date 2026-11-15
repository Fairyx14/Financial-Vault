/**
 * Budget Vault calculation tests. Run with: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Decimal } from "./decimal.ts";
import {
  addMonthsISO,
  calendarMonth,
  categoryComparison,
  entriesBetween,
  isRecorded,
  periodRange,
  spendingBreakdown,
  annualCost,
  billPaymentsBetween,
  billsOverview,
  budgetOverview,
  copyBudgets,
  nextDue,
  unconfirmedBills,
  validateBudgetLimits,
  EMPTY_BUDGET,
  monthlyTrend,
  monthRange,
  occurrences,
  summarizeMonth,
  upcomingPayments,
  validateCategoryName,
  validateExpense,
  validateIncome,
  type BudgetData,
  type ExpenseRecord,
  type IncomeRecord,
} from "./budget.ts";

const TODAY = "2026-11-15";
const pounds = (v: { toFixed: (n: number) => string }) => v.toFixed(2);

const income = (o: Partial<IncomeRecord> = {}): IncomeRecord => ({
  id: "i1",
  name: "Salary",
  amount: "2800",
  gross: "",
  category: "salary",
  date: "2026-01-25",
  frequency: "monthly",
  endDate: "",
  notes: "",
  ...o,
});

const expense = (o: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: "e1",
  kind: "expense",
  description: "Weekly shop",
  amount: "60",
  date: "2026-11-02",
  category: "groceries",
  paymentMethod: "debit-card",
  frequency: "once",
  endDate: "",
  notes: "",
  billType: "",
  ...o,
});

const data = (incomes: IncomeRecord[], expenses: ExpenseRecord[]): BudgetData => ({ ...EMPTY_BUDGET, incomes, expenses });

describe("Dates", () => {
  it("knows how long each month is", () => {
    assert.deepEqual(monthRange("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
    assert.deepEqual(monthRange("2028-02"), { from: "2028-02-01", to: "2028-02-29" });
  });

  it("clamps the 31st to the end of shorter months", () => {
    assert.equal(addMonthsISO("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonthsISO("2026-01-31", 3), "2026-04-30");
  });
});

describe("Recurring dates", () => {
  const nov = monthRange("2026-11");

  it("puts a monthly payment once in each month", () => {
    assert.deepEqual(occurrences("2026-01-25", "monthly", "", nov.from, nov.to), ["2026-11-25"]);
  });

  it("keeps a 31st payment on the last day of short months without drifting", () => {
    const feb = monthRange("2026-02");
    const mar = monthRange("2026-03");
    assert.deepEqual(occurrences("2026-01-31", "monthly", "", feb.from, feb.to), ["2026-02-28"]);
    assert.deepEqual(occurrences("2026-01-31", "monthly", "", mar.from, mar.to), ["2026-03-31"]);
  });

  it("counts weekly payments that fall in the month (4 or 5)", () => {
    // Mondays from 2 Nov 2026: 2, 9, 16, 23, 30.
    assert.equal(occurrences("2026-11-02", "weekly", "", nov.from, nov.to).length, 5);
    assert.equal(occurrences("2026-11-03", "weekly", "", nov.from, nov.to).length, 4);
  });

  it("handles fortnightly and four-weekly pay", () => {
    assert.deepEqual(occurrences("2026-10-09", "fortnightly", "", nov.from, nov.to), ["2026-11-06", "2026-11-20"]);
    // 2 Jan + 11 × 28 days = 6 Nov; the next one (4 Dec) is outside November.
    assert.deepEqual(occurrences("2026-01-02", "four-weekly", "", nov.from, nov.to), ["2026-11-06"]);
  });

  it("handles quarterly and yearly payments", () => {
    assert.deepEqual(occurrences("2026-02-10", "quarterly", "", nov.from, nov.to), ["2026-11-10"]);
    assert.deepEqual(occurrences("2026-02-10", "quarterly", "", "2026-12-01", "2026-12-31"), []);
    assert.deepEqual(occurrences("2025-11-03", "yearly", "", nov.from, nov.to), ["2026-11-03"]);
  });

  it("stops at the end date and never starts before the first date", () => {
    assert.deepEqual(occurrences("2026-01-25", "monthly", "2026-10-31", nov.from, nov.to), []);
    assert.deepEqual(occurrences("2026-12-25", "monthly", "", nov.from, nov.to), []);
    assert.deepEqual(occurrences("2026-11-20", "weekly", "", nov.from, nov.to), ["2026-11-20", "2026-11-27"]);
  });

  it("places a one-off only in its own month", () => {
    assert.deepEqual(occurrences("2026-11-02", "once", "", nov.from, nov.to), ["2026-11-02"]);
    assert.deepEqual(occurrences("2026-10-02", "once", "", nov.from, nov.to), []);
  });
});

describe("Monthly totals", () => {
  it("matches the example: £3,500 in, £2,100 out, £1,400 left, 40% saved", () => {
    const s = summarizeMonth(
      data([income({ amount: "3500" })], [expense({ amount: "2100", category: "housing", date: "2026-11-01" })]),
      "2026-11",
      TODAY,
    );
    assert.equal(pounds(s.income), "3500.00");
    assert.equal(pounds(s.spending), "2100.00");
    assert.equal(pounds(s.remaining), "1400.00");
    assert.equal(s.savingsRatePct?.toFixed(1), "40.0");
  });

  it("counts income net and never adds the gross figure", () => {
    const s = summarizeMonth(data([income({ amount: "2800", gross: "3600" })], []), "2026-11", TODAY);
    assert.equal(pounds(s.income), "2800.00");
  });

  it("does not duplicate a recurring payment", () => {
    const s = summarizeMonth(data([], [expense({ amount: "950", category: "housing", frequency: "monthly", date: "2026-01-01" })]), "2026-11", TODAY);
    assert.equal(pounds(s.spending), "950.00");
  });

  it("lets refunds reduce spending in their category", () => {
    const s = summarizeMonth(
      data([], [
        expense({ id: "a", amount: "120", category: "shopping" }),
        expense({ id: "b", kind: "refund", amount: "45.50", category: "shopping", date: "2026-11-09" }),
      ]),
      "2026-11",
      TODAY,
    );
    assert.equal(pounds(s.spending), "74.50");
    assert.equal(pounds(s.categories[0].amount), "74.50");
  });

  it("leaves transfers out of income and spending (e.g. paying off a credit card)", () => {
    const s = summarizeMonth(
      data([income()], [
        expense({ id: "card", amount: "200", category: "dining", paymentMethod: "credit-card" }),
        expense({ id: "pay", kind: "transfer", amount: "200", category: "", description: "Credit card bill", date: "2026-11-12" }),
      ]),
      "2026-11",
      TODAY,
    );
    assert.equal(pounds(s.spending), "200.00", "the card purchase is counted once");
    assert.equal(pounds(s.income), "2800.00");
    assert.equal(pounds(s.transfers), "200.00");
  });

  it("splits out what is still expected later in the month", () => {
    const s = summarizeMonth(
      data([income()], [expense({ amount: "30", date: "2026-11-20", category: "dining" })]),
      "2026-11",
      TODAY,
    );
    assert.equal(pounds(s.expectedIncome), "2800.00", "salary on the 25th is after today");
    assert.equal(pounds(s.expectedSpending), "30.00");
  });

  it("ranks categories by spending with each one's share", () => {
    const s = summarizeMonth(
      data([], [
        expense({ id: "a", amount: "300", category: "groceries" }),
        expense({ id: "b", amount: "100", category: "transport" }),
      ]),
      "2026-11",
      TODAY,
    );
    assert.deepEqual(
      s.categories.map((c) => `${c.category} ${c.pct.toFixed(0)}%`),
      ["groceries 75%", "transport 25%"],
    );
  });

  it("has no savings rate without income, and a negative one when spending exceeds income", () => {
    assert.equal(summarizeMonth(data([], [expense()]), "2026-11", TODAY).savingsRatePct, null);
    const over = summarizeMonth(data([income({ amount: "1000" })], [expense({ amount: "1250" })]), "2026-11", TODAY);
    assert.equal(over.savingsRatePct?.toFixed(1), "-25.0");
  });

  it("is all zero for an empty month", () => {
    const s = summarizeMonth(EMPTY_BUDGET, "2026-11", TODAY);
    assert.ok(s.income.isZero() && s.spending.isZero() && s.remaining.isZero());
    assert.deepEqual(s.categories, []);
  });

  it("adds pennies exactly", () => {
    const s = summarizeMonth(
      data([], [expense({ id: "a", amount: "0.10" }), expense({ id: "b", amount: "0.20" })]),
      "2026-11",
      TODAY,
    );
    assert.equal(s.spending.toString(), "0.3");
  });
});

describe("Trend and upcoming payments", () => {
  it("builds a six-month trend, oldest first", () => {
    const trend = monthlyTrend(data([income({ date: "2026-09-25" })], []), "2026-11", 6, TODAY);
    assert.deepEqual(
      trend.map((m) => m.month),
      ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"],
    );
    assert.deepEqual(
      trend.map((m) => pounds(m.income)),
      ["0.00", "0.00", "0.00", "2800.00", "2800.00", "2800.00"],
    );
  });

  it("lists recurring payments due in the next 30 days, soonest first", () => {
    const upcoming = upcomingPayments(
      data([income()], [
        expense({ id: "rent", description: "Rent", amount: "950", category: "housing", frequency: "monthly", date: "2026-01-01" }),
        expense({ id: "gym", description: "Gym", amount: "35", category: "health", frequency: "monthly", date: "2026-01-20" }),
        expense({ id: "once", description: "Concert", amount: "60", date: "2026-11-30", category: "entertainment" }),
      ]),
      TODAY,
      30,
    );
    // Window is 16 Nov to 15 Dec. One-off payments and income aren't listed.
    assert.deepEqual(
      upcoming.map((u) => `${u.date} ${u.label}`),
      ["2026-11-20 Gym", "2026-12-01 Rent"],
    );
  });
});

describe("Validation", () => {
  const goodIncome = { name: "Salary", amount: "2800", gross: "", category: "salary" as const, date: "2026-01-25", frequency: "monthly" as const, endDate: "", notes: "" };
  const goodExpense = { kind: "expense" as const, description: "Shop", amount: "60", date: "2026-11-02", category: "groceries", paymentMethod: "", frequency: "once" as const, endDate: "", notes: "", billType: "" };

  it("accepts complete records", () => {
    assert.deepEqual(validateIncome(goodIncome), {});
    assert.deepEqual(validateExpense(goodExpense, []), {});
  });

  it("explains missing or invalid amounts", () => {
    assert.match(validateIncome({ ...goodIncome, amount: "" }).amount ?? "", /Enter/);
    assert.match(validateIncome({ ...goodIncome, amount: "0" }).amount ?? "", /more than zero/);
    assert.match(validateExpense({ ...goodExpense, amount: "12.345" }, []).amount ?? "", /2 decimal places/);
    assert.match(validateExpense({ ...goodExpense, amount: "abc" }, []).amount ?? "", /as a number/);
  });

  it("checks gross pay is not less than net pay", () => {
    assert.match(validateIncome({ ...goodIncome, gross: "2000" }).gross ?? "", /at least/);
    assert.equal(validateIncome({ ...goodIncome, gross: "3600" }).gross, undefined);
  });

  it("checks the end date comes after the start", () => {
    assert.match(validateIncome({ ...goodIncome, endDate: "2025-12-01" }).endDate ?? "", /before the first date/);
  });

  it("needs a category except for transfers", () => {
    assert.ok(validateExpense({ ...goodExpense, category: "" }, []).category);
    assert.equal(validateExpense({ ...goodExpense, kind: "transfer", category: "" }, []).category, undefined);
  });

  it("accepts custom categories and rejects duplicate names", () => {
    const custom = [{ id: "custom:pets", name: "Pets" }];
    assert.equal(validateExpense({ ...goodExpense, category: "custom:pets" }, custom).category, undefined);
    assert.match(validateCategoryName("pets", custom) ?? "", /already exists/);
    assert.match(validateCategoryName("Groceries", custom) ?? "", /already exists/);
    assert.equal(validateCategoryName("Garden", custom), undefined);
  });
});

describe("Bills and subscriptions", () => {
  const rent = expense({ id: "rent", description: "Rent", amount: "950", category: "housing", frequency: "monthly", date: "2026-01-01", billType: "rent-mortgage" });
  const netflix = expense({ id: "tv", description: "Streaming", amount: "10.99", category: "subscriptions", frequency: "monthly", date: "2026-03-20", billType: "streaming" });
  const insurance = expense({ id: "ins", description: "Car insurance", amount: "480", category: "insurance", frequency: "yearly", date: "2026-04-02", billType: "insurance" });
  const gym = expense({ id: "gym", description: "Gym", amount: "8", category: "health", frequency: "weekly", date: "2026-01-05", billType: "gym", endDate: "2026-06-30" });

  it("annualises each frequency", () => {
    assert.equal(pounds(annualCost({ amount: "10.99", frequency: "monthly" })), "131.88");
    assert.equal(pounds(annualCost({ amount: "8", frequency: "weekly" })), "416.00");
    assert.equal(pounds(annualCost({ amount: "40", frequency: "four-weekly" })), "520.00");
    assert.equal(pounds(annualCost({ amount: "90", frequency: "quarterly" })), "360.00");
    assert.equal(pounds(annualCost({ amount: "480", frequency: "yearly" })), "480.00");
  });

  it("finds the next due date, including today, and null once ended", () => {
    assert.equal(nextDue(netflix, TODAY), "2026-11-20");
    assert.equal(nextDue(rent, TODAY), "2026-12-01");
    assert.equal(nextDue(insurance, TODAY), "2027-04-02");
    assert.equal(nextDue(netflix, "2026-11-20"), "2026-11-20");
    assert.equal(nextDue(gym, TODAY), null);
  });

  it("totals active bills and subscriptions separately, leaving ended ones out", () => {
    const o = billsOverview(data([], [rent, netflix, insurance, gym, expense()]), TODAY);
    assert.deepEqual(o.bills.map((b) => b.record.id), ["tv", "rent", "ins", "gym"]);
    assert.equal(pounds(o.annualBills), "11880.00"); // 950 x 12 + 480
    assert.equal(pounds(o.annualSubscriptions), "131.88");
    assert.equal(pounds(o.annualTotal), "12011.88");
    assert.equal(pounds(o.monthlyAverage), "1000.99");
  });

  it("ignores one-off expenses, refunds and transfers even if tagged", () => {
    const o = billsOverview(
      data([], [expense({ billType: "phone" }), expense({ id: "r", kind: "refund", frequency: "monthly", billType: "phone" })]),
      TODAY,
    );
    assert.equal(o.bills.length, 0);
  });

  it("gives each payment a status without changing spending totals", () => {
    const d = { ...data([], [rent, netflix]), paidBills: ["rent@2026-11-01"] };
    const payments = billPaymentsBetween(d, "2026-10-01", "2026-11-30", TODAY);
    assert.deepEqual(
      payments.map((p) => `${p.date} ${p.recordId} ${p.status}`),
      ["2026-10-01 rent unconfirmed", "2026-10-20 tv unconfirmed", "2026-11-01 rent paid", "2026-11-20 tv upcoming"],
    );
    assert.equal(billPaymentsBetween(d, TODAY, TODAY, TODAY).length, 0);
    const dueToday = billPaymentsBetween(data([], [netflix]), "2026-11-20", "2026-11-20", "2026-11-20");
    assert.equal(dueToday[0].status, "due-today");
    // Marking paid is a confirmation only: spending is identical either way.
    assert.equal(
      pounds(summarizeMonth(d, "2026-11", TODAY).spending),
      pounds(summarizeMonth(data([], [rent, netflix]), "2026-11", TODAY).spending),
    );
  });

  it("lists recent past payments not yet confirmed", () => {
    const d = { ...data([], [rent, netflix]), paidBills: ["rent@2026-11-01"] };
    assert.deepEqual(unconfirmedBills(d, TODAY, 30).map((p) => p.key), ["tv@2026-10-20"]);
  });

  it("leaves paid bills out of upcoming payments and includes today", () => {
    const d = { ...data([], [netflix, rent]), paidBills: ["tv@2026-11-20"] };
    assert.deepEqual(upcomingPayments(d, "2026-11-20", 30).map((u) => u.key), ["rent@2026-12-01"]);
    assert.deepEqual(upcomingPayments(data([], [netflix]), "2026-11-20", 30).map((u) => u.key), ["tv@2026-11-20"]);
  });

  it("checks bill type and frequency", () => {
    const base = {
      kind: "expense" as const,
      description: "Phone",
      amount: "20",
      date: "2026-11-02",
      category: "utilities",
      paymentMethod: "",
      frequency: "monthly" as const,
      endDate: "",
      notes: "",
      billType: "phone",
    };
    assert.deepEqual(validateExpense(base, []), {});
    assert.match(validateExpense({ ...base, frequency: "once" }, []).frequency ?? "", /repeat/);
    assert.match(validateExpense({ ...base, billType: "nope" }, []).billType ?? "", /bill type/);
  });
});

describe("Category budgets", () => {
  const spend = [
    expense({ id: "g1", amount: "180", category: "groceries", date: "2026-11-03" }),
    expense({ id: "g2", amount: "70", category: "groceries", date: "2026-11-10" }),
    expense({ id: "d1", amount: "230", category: "dining", date: "2026-11-08" }),
    expense({ id: "d2", kind: "refund", amount: "20", category: "dining", date: "2026-11-09" }),
    expense({ id: "t1", amount: "40", category: "transport", date: "2026-11-04" }),
    expense({ id: "s1", amount: "65", category: "shopping", date: "2026-11-05" }),
    expense({ id: "x", kind: "transfer", amount: "500", category: "", date: "2026-11-06" }),
  ];
  const budgets = { "2026-11": { groceries: "300", transport: "150", dining: "200" } };

  it("shows allocated, spent, remaining, % used and a warning level", () => {
    const o = budgetOverview({ ...data([], spend), budgets }, "2026-11", TODAY);
    const line = (c: string) => o.lines.find((l) => l.category === c)!;
    assert.deepEqual(
      [pounds(line("groceries").spent), pounds(line("groceries").remaining), line("groceries").usedPct.toFixed(1), line("groceries").status],
      ["250.00", "50.00", "83.3", "near"],
    );
    // Refund taken off: 230 - 20 = 210 against 200.
    assert.deepEqual([pounds(line("dining").spent), pounds(line("dining").remaining), line("dining").status], ["210.00", "-10.00", "over"]);
    assert.deepEqual([line("transport").usedPct.toFixed(1), line("transport").status], ["26.7", "ok"]);
    assert.deepEqual(o.lines.map((l) => l.category), ["dining", "groceries", "transport"]);
  });

  it("totals budget used across budgeted categories and lists the rest separately", () => {
    const o = budgetOverview({ ...data([], spend), budgets }, "2026-11", TODAY);
    assert.equal(pounds(o.allocated), "650.00");
    assert.equal(pounds(o.spent), "500.00"); // 250 + 210 + 40; the transfer isn't counted
    assert.equal(o.usedPct?.toFixed(1), "76.9");
    assert.deepEqual(o.unbudgeted.map((c) => c.category), ["shopping"]);
    assert.equal(pounds(o.unbudgetedTotal), "65.00");
  });

  it("treats 80% and exactly 100% as close to the limit, not over", () => {
    const at = (amount: string) =>
      budgetOverview({ ...data([], [expense({ amount })]), budgets: { "2026-11": { groceries: "300" } } }, "2026-11", TODAY).lines[0].status;
    assert.equal(at("239.99"), "ok");
    assert.equal(at("240"), "near");
    assert.equal(at("300"), "near");
    assert.equal(at("300.01"), "over");
  });

  it("has no budget used % when no limits are set for the month", () => {
    const o = budgetOverview({ ...data([], spend), budgets }, "2026-12", TODAY);
    assert.equal(o.usedPct, null);
    assert.equal(o.lines.length, 0);
  });

  it("keeps each month's budgets separate", () => {
    const o = budgetOverview({ ...data([], spend), budgets: { ...budgets, "2026-10": { groceries: "1" } } }, "2026-11", TODAY);
    assert.equal(pounds(o.lines.find((l) => l.category === "groceries")!.allocated), "300.00");
  });

  it("copies a month's budgets forward and reports which months it replaces", () => {
    const start = { ...budgets, "2027-01": { travel: "500" } };
    const { budgets: next, replaced } = copyBudgets(start, "2026-11", 3);
    assert.deepEqual(Object.keys(next).sort(), ["2026-11", "2026-12", "2027-01", "2027-02"]);
    assert.deepEqual(next["2027-02"], budgets["2026-11"]);
    assert.deepEqual(next["2027-01"], budgets["2026-11"]);
    assert.deepEqual(replaced, ["2027-01"]);
    // Each copy is independent of the original.
    next["2026-12"].groceries = "1";
    assert.equal(start["2026-11"].groceries, "300");
  });

  it("validates limits, allowing blanks", () => {
    assert.deepEqual(validateBudgetLimits({ groceries: "300", dining: "" }), {});
    const errors = validateBudgetLimits({ groceries: "-5", dining: "abc", transport: "1.234" });
    assert.deepEqual(Object.keys(errors).sort(), ["dining", "groceries", "transport"]);
  });
});

describe("Recorded vs scheduled", () => {
  const rent = expense({ id: "rent", amount: "950", category: "housing", frequency: "monthly", date: "2026-01-01", billType: "rent-mortgage" });

  it("treats past one-offs as recorded and future ones as scheduled", () => {
    const d = data([], [expense({ date: "2026-11-02" }), expense({ id: "e2", date: "2026-11-20" })]);
    const [past, future] = entriesBetween(d, "2026-11-01", "2026-11-30", TODAY);
    assert.equal(isRecorded(past, d, TODAY), true);
    assert.equal(isRecorded(future, d, TODAY), false);
  });

  it("treats repeating entries as scheduled until a bill is marked paid", () => {
    const d = { ...data([income()], [rent]), paidBills: ["rent@2026-11-01"] };
    const entries = entriesBetween(d, "2026-10-01", "2026-11-30", TODAY);
    const status = (key: string) => isRecorded(entries.find((e) => e.key === key)!, d, TODAY);
    assert.equal(status("rent@2026-11-01"), true);
    assert.equal(status("rent@2026-10-01"), false);
    assert.equal(status("i1@2026-10-25"), false);
  });
});

describe("Cash-flow calendar", () => {
  it("lays the month out in whole Monday-to-Sunday weeks", () => {
    const weeks = calendarMonth(EMPTY_BUDGET, "2026-11", TODAY);
    // 1 Nov 2026 is a Sunday, so the grid starts on Monday 26 Oct and ends Sunday 6 Dec.
    assert.equal(weeks.length, 6);
    assert.ok(weeks.every((w) => w.length === 7));
    assert.equal(weeks[0][0].date, "2026-10-26");
    assert.equal(weeks[0][6].date, "2026-11-01");
    assert.equal(weeks[5][6].date, "2026-12-06");
    assert.equal(weeks[0][0].inMonth, false);
    assert.equal(weeks[0][6].inMonth, true);
  });

  it("puts each entry on its day with daily totals", () => {
    const d = data([income()], [
      expense({ id: "a", amount: "60", date: "2026-11-25" }),
      expense({ id: "b", kind: "refund", amount: "10", date: "2026-11-25" }),
      expense({ id: "c", kind: "transfer", amount: "500", category: "", date: "2026-11-25" }),
    ]);
    const day = calendarMonth(d, "2026-11", TODAY).flat().find((x) => x.date === "2026-11-25")!;
    assert.equal(day.entries.length, 4);
    assert.equal(pounds(day.income), "2800.00");
    assert.equal(pounds(day.spending), "50.00");
    assert.equal(pounds(day.transfers), "500.00");
    assert.ok(day.entries.every((e) => e.recorded === false)); // all after today
  });

  it("shows padding days from neighbouring months too", () => {
    const d = data([income({ date: "2026-10-26", frequency: "once" })], []);
    const first = calendarMonth(d, "2026-11", TODAY)[0][0];
    assert.equal(first.entries.length, 1);
    assert.equal(first.entries[0].recorded, true);
  });
});

describe("Analytics", () => {
  const cats = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ category: `c${i}`, amount: Decimal.of(100 - i * 10), pct: Decimal.of(10) }));

  it("groups small categories into Other", () => {
    assert.equal(spendingBreakdown(cats(5), 7).length, 5);
    const slices = spendingBreakdown(cats(9), 7);
    assert.equal(slices.length, 7);
    assert.equal(slices[6].category, "other");
    assert.equal(pounds(slices[6].amount), "90.00"); // 40 + 30 + 20
    assert.equal(slices[6].pct.toFixed(0), "30");
  });

  it("compares each category with last month and the earlier average", () => {
    const d = data([], [
      expense({ id: "g-nov", amount: "300", date: "2026-11-02" }),
      expense({ id: "g-oct", amount: "240", date: "2026-10-02" }),
      expense({ id: "g-sep", amount: "180", date: "2026-09-02" }),
      expense({ id: "d-oct", amount: "90", category: "dining", date: "2026-10-05" }),
    ]);
    const rows = categoryComparison(d, "2026-11", 3, TODAY);
    const g = rows.find((r) => r.category === "groceries")!;
    assert.deepEqual([pounds(g.current), pounds(g.previous), pounds(g.change), pounds(g.average)], ["300.00", "240.00", "60.00", "140.00"]);
    const dining = rows.find((r) => r.category === "dining")!;
    assert.deepEqual([pounds(dining.current), pounds(dining.change), pounds(dining.average)], ["0.00", "-90.00", "30.00"]);
    assert.equal(rows[0].category, "groceries");
  });

  it("gives a savings-rate history with gaps for months without income", () => {
    const trend = monthlyTrend(data([income({ date: "2026-10-25" })], [expense({ amount: "700", date: "2026-11-02" })]), "2026-11", 3, TODAY);
    assert.deepEqual(trend.map((m) => m.savingsRatePct?.toFixed(1) ?? null), [null, "100.0", "75.0"]);
  });
});

describe("Search periods", () => {
  it("ends with the selected month and counts back", () => {
    assert.deepEqual(periodRange(EMPTY_BUDGET, "2026-11", "1"), { from: "2026-11-01", to: "2026-11-30" });
    assert.deepEqual(periodRange(EMPTY_BUDGET, "2026-11", "3"), { from: "2026-09-01", to: "2026-11-30" });
    assert.deepEqual(periodRange(EMPTY_BUDGET, "2026-02", "12"), { from: "2025-03-01", to: "2026-02-28" });
  });

  it("starts 'all dates' at the earliest record", () => {
    const d = data([income({ date: "2025-06-25" })], [expense({ date: "2026-01-04" })]);
    assert.deepEqual(periodRange(d, "2026-11", "all"), { from: "2025-06-25", to: "2026-11-30" });
    assert.deepEqual(periodRange(EMPTY_BUDGET, "2026-11", "all"), { from: "2026-11-01", to: "2026-11-30" });
  });

  it("finds every occurrence of a repeating entry across the period without duplicates", () => {
    const d = data([income()], []);
    const { from, to } = periodRange(d, "2026-11", "6");
    const entries = entriesBetween(d, from, to, TODAY);
    assert.deepEqual(entries.map((e) => e.date), ["2026-06-25", "2026-07-25", "2026-08-25", "2026-09-25", "2026-10-25", "2026-11-25"]);
    assert.equal(new Set(entries.map((e) => e.key)).size, 6);
  });
});
