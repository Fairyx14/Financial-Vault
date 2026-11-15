/**
 * Savings Vault link and Budget Vault export tests. Run with: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_BUDGET, savingsPlan, validateAllocation, type BudgetData, type ExpenseRecord, type SavingsAllocation } from "./budget.ts";
import { backupJSON, csvCell, monthlySummaryCSV, transactionsCSV } from "./budgetExport.ts";
import { confirmDeposit, depositNote, undoDeposit, type LinkedGoal } from "./savingsLink.ts";

const TODAY = "2026-11-15";

const allocation = (o: Partial<SavingsAllocation> = {}): SavingsAllocation => ({
  id: "a1",
  goalId: "house",
  goalName: "House deposit",
  month: "2026-11",
  amount: "500",
  status: "planned",
  depositDate: "",
  depositEntryId: "",
  ...o,
});

const goals = (): LinkedGoal[] => [
  { id: "house", name: "House deposit", entries: [{ id: "s", date: "2026-01-01", amount: 1000, note: "Starting balance", starting: true }] },
  { id: "car", name: "Car", entries: [] },
];

const expense = (o: Partial<ExpenseRecord>): ExpenseRecord => ({
  id: "e",
  kind: "expense",
  description: "Rent",
  amount: "2000",
  date: "2026-01-01",
  category: "housing",
  paymentMethod: "standing-order",
  frequency: "monthly",
  endDate: "",
  notes: "",
  billType: "rent-mortgage",
  ...o,
});

const budget = (o: Partial<BudgetData> = {}): BudgetData => ({
  ...EMPTY_BUDGET,
  incomes: [{ id: "sal", name: "Salary", amount: "3500", gross: "", category: "salary", date: "2026-01-10", frequency: "monthly", endDate: "", notes: "" }],
  expenses: [expense({})],
  ...o,
});

describe("Savings plan for a month", () => {
  it("matches the brief: £3,500 in, £2,000 out, £500 to the house deposit leaves £1,000", () => {
    const p = savingsPlan(budget({ allocations: [allocation()] }), "2026-11", TODAY);
    assert.equal(p.leftOver.toFixed(2), "1500.00");
    assert.equal(p.planned.toFixed(2), "500.00");
    assert.equal(p.completed.toFixed(2), "0.00");
    assert.equal(p.unallocated.toFixed(2), "1000.00");
  });

  it("keeps planned and completed apart, and only counts the chosen month", () => {
    const p = savingsPlan(
      budget({
        allocations: [
          allocation(),
          allocation({ id: "a2", amount: "200", status: "completed", depositEntryId: "x", depositDate: "2026-11-02" }),
          allocation({ id: "a3", month: "2026-10" }),
        ],
      }),
      "2026-11",
      TODAY,
    );
    assert.deepEqual([p.planned.toFixed(2), p.completed.toFixed(2), p.unallocated.toFixed(2), p.allocations.length], ["500.00", "200.00", "800.00", 2]);
  });

  it("does not change spending, income or the savings rate", () => {
    const without = budget();
    const withAlloc = budget({ allocations: [allocation({ status: "completed", depositEntryId: "x" })] });
    assert.equal(savingsPlan(withAlloc, "2026-11", TODAY).leftOver.toFixed(2), savingsPlan(without, "2026-11", TODAY).leftOver.toFixed(2));
  });

  it("goes negative when more is allocated than was left", () => {
    assert.equal(savingsPlan(budget({ allocations: [allocation({ amount: "1600" })] }), "2026-11", TODAY).unallocated.toFixed(2), "-100.00");
  });

  it("validates the goal and amount", () => {
    assert.deepEqual(validateAllocation({ goalId: "house", amount: "500" }, ["house"]), {});
    const errors = validateAllocation({ goalId: "gone", amount: "-1" }, ["house"]);
    assert.ok(errors.goalId && errors.amount);
  });
});

describe("Confirming a deposit into the Savings Vault", () => {
  it("adds exactly one entry to the right goal and marks the allocation completed", () => {
    const result = confirmDeposit(goals(), allocation(), "2026-11-14", TODAY);
    assert.ok(result.ok);
    if (!result.ok) return;
    const house = result.goals.find((g) => g.id === "house")!;
    assert.equal(house.entries.length, 2);
    assert.deepEqual(house.entries[1], { id: "budget-a1", date: "2026-11-14", amount: 500, note: depositNote(allocation()) });
    assert.equal(result.goals.find((g) => g.id === "car")!.entries.length, 0);
    assert.deepEqual([result.allocation.status, result.allocation.depositEntryId, result.allocation.depositDate], ["completed", "budget-a1", "2026-11-14"]);
  });

  it("never adds the same deposit twice", () => {
    const first = confirmDeposit(goals(), allocation(), TODAY, TODAY);
    assert.ok(first.ok);
    if (!first.ok) return;
    // Again with the completed allocation...
    assert.equal(confirmDeposit(first.goals, first.allocation, TODAY, TODAY).ok, false);
    // ...or from a double click or stale page that still thinks it's planned.
    assert.equal(confirmDeposit(first.goals, allocation(), TODAY, TODAY).ok, false);
  });

  it("refuses future dates and missing goals", () => {
    assert.match((confirmDeposit(goals(), allocation(), "2026-11-16", TODAY) as { reason: string }).reason, /future/);
    assert.match((confirmDeposit(goals(), allocation({ goalId: "gone" }), TODAY, TODAY) as { reason: string }).reason, /no longer exists/);
  });

  it("keeps pence exactly", () => {
    const r = confirmDeposit(goals(), allocation({ amount: "123.45" }), TODAY, TODAY);
    assert.ok(r.ok && r.goals[0].entries[1].amount === 123.45);
  });

  it("undo removes only that deposit and returns the allocation to planned", () => {
    const done = confirmDeposit(goals(), allocation(), TODAY, TODAY);
    assert.ok(done.ok);
    if (!done.ok) return;
    const undone = undoDeposit(done.goals, done.allocation);
    assert.equal(undone.removed, true);
    assert.deepEqual(undone.goals.find((g) => g.id === "house")!.entries.map((e) => e.id), ["s"]);
    assert.deepEqual([undone.allocation.status, undone.allocation.depositEntryId], ["planned", ""]);
  });

  it("undo still resets the allocation if the deposit was already deleted in the Savings Vault", () => {
    const undone = undoDeposit(goals(), allocation({ status: "completed", depositEntryId: "gone" }));
    assert.equal(undone.removed, false);
    assert.equal(undone.allocation.status, "planned");
    assert.equal(undone.goals[0].entries.length, 1);
  });
});

describe("Export", () => {
  it("escapes CSV cells and blocks spreadsheet formulas", () => {
    assert.equal(csvCell("Rent"), "Rent");
    assert.equal(csvCell('Say "hi", ok'), '"Say ""hi"", ok"');
    assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
    assert.equal(csvCell("-2+3"), "'-2+3");
    assert.equal(csvCell("@sum"), "'@sum");
    assert.equal(csvCell(-12.5), "-12.5");
    assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
  });

  it("lists one row per payment, with no duplicates for repeating entries", () => {
    const d = budget({
      expenses: [
        expense({}),
        expense({ id: "r", kind: "refund", description: "=cmd", amount: "20", date: "2026-11-03", frequency: "once", billType: "", category: "dining", notes: "a, b" }),
        expense({ id: "t", kind: "transfer", description: "Card bill", amount: "300", date: "2026-11-04", frequency: "once", billType: "", category: "" }),
      ],
      paidBills: ["e@2026-11-01"],
    });
    const lines = transactionsCSV(d, "2026-11-01", "2026-11-30", TODAY).trimEnd().split("\r\n");
    assert.equal(lines[0], "Date,Description,Counts as,Category,Amount (GBP),How often,Status,Payment method,Bill type,Notes");
    assert.deepEqual(lines.slice(1), [
      "2026-11-01,Rent,Spending,Housing,2000,Monthly,Recorded,Standing order,Rent or mortgage,",
      "2026-11-03,'=cmd,Refund (reduces spending),Dining,20,One-off,Recorded,Standing order,,\"a, b\"",
      "2026-11-04,Card bill,Transfer (not counted),,300,One-off,Recorded,Standing order,,",
      "2026-11-10,Salary,Income,Employment salary,3500,Monthly,Scheduled,,,",
    ]);
  });

  it("summarises each month", () => {
    const lines = monthlySummaryCSV(budget(), "2026-11", 2, TODAY).trimEnd().split("\r\n");
    assert.deepEqual(lines, [
      "Month,Net income (GBP),Spending (GBP),Left over (GBP),Savings rate (%),\"Transfers, not counted (GBP)\"",
      "2026-10,3500,2000,1500,42.9,0",
      "2026-11,3500,2000,1500,42.9,0",
    ]);
  });

  it("backs up everything as readable JSON", () => {
    const d = budget({ allocations: [allocation()] });
    const parsed = JSON.parse(backupJSON(d, "2026-11-15T10:00:00.000Z"));
    assert.equal(parsed.vault, "Budget Vault");
    assert.equal(parsed.currency, "GBP");
    assert.deepEqual(parsed.data, d);
  });
});
