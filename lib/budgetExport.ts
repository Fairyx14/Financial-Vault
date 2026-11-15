/**
 * Budget Vault downloads. Files are built in the browser; nothing is uploaded anywhere.
 */
import {
  billTypeOf,
  categoryName,
  entriesBetween,
  FREQUENCIES,
  isRecorded,
  monthlyTrend,
  PAYMENT_METHODS,
  type BudgetData,
} from "./budget.ts";

/**
 * One CSV cell. Quotes when needed, and stops spreadsheet apps treating text that starts
 * with = + - @ (or a tab/return) as a formula. Numbers are passed through untouched.
 */
export function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows to CSV text with Windows line endings, which every spreadsheet app reads. */
export const toCSV = (rows: (string | number)[][]) => rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";

const COUNTS_AS = {
  income: "Income",
  expense: "Spending",
  refund: "Refund (reduces spending)",
  transfer: "Transfer (not counted)",
} as const;

/** Every income and money-out entry between two dates, oldest first, one row per payment. */
export function transactionsCSV(data: BudgetData, from: string, to: string, today: string): string {
  const incomes = new Map(data.incomes.map((r) => [r.id, r]));
  const expenses = new Map(data.expenses.map((r) => [r.id, r]));
  const rows: (string | number)[][] = [
    ["Date", "Description", "Counts as", "Category", "Amount (GBP)", "How often", "Status", "Payment method", "Bill type", "Notes"],
  ];
  for (const e of entriesBetween(data, from, to, today)) {
    const record = e.type === "income" ? incomes.get(e.recordId) : expenses.get(e.recordId);
    const expense = e.type === "income" ? undefined : expenses.get(e.recordId);
    rows.push([
      e.date,
      e.label,
      COUNTS_AS[e.type],
      e.type === "transfer" ? "" : categoryName(e.category, data.customCategories),
      Number(e.amount.toFixed(2)),
      FREQUENCIES.find((f) => f.id === record?.frequency)?.label ?? "",
      isRecorded(e, data, today) ? "Recorded" : "Scheduled",
      expense ? (PAYMENT_METHODS.find((p) => p.id === expense.paymentMethod)?.label ?? "") : "",
      expense ? (billTypeOf(expense.billType)?.label ?? "") : "",
      record?.notes ?? "",
    ]);
  }
  return toCSV(rows);
}

/** Income, spending, what was left and the savings rate for each month, oldest first. */
export function monthlySummaryCSV(data: BudgetData, lastMonth: string, count: number, today: string): string {
  const rows: (string | number)[][] = [["Month", "Net income (GBP)", "Spending (GBP)", "Left over (GBP)", "Savings rate (%)", "Transfers, not counted (GBP)"]];
  for (const m of monthlyTrend(data, lastMonth, count, today)) {
    rows.push([
      m.month,
      Number(m.income.toFixed(2)),
      Number(m.spending.toFixed(2)),
      Number(m.remaining.toFixed(2)),
      m.savingsRatePct ? Number(m.savingsRatePct.toFixed(1)) : "",
      Number(m.transfers.toFixed(2)),
    ]);
  }
  return toCSV(rows);
}

/** Everything in the Budget Vault, as saved, with a small header saying what the file is. */
export function backupJSON(data: BudgetData, exportedAt: string): string {
  return JSON.stringify({ app: "Dream Vault", vault: "Budget Vault", exportedAt, currency: "GBP", data }, null, 2);
}
