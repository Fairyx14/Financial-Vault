/**
 * Budget Vault data model and calculations.
 *
 * RULES (so totals are never double-counted)
 * - Recurring income and expenses are stored ONCE, as a rule ("£2,800 monthly from 25 Jan").
 *   Each month works out its own payment dates from the rule, so a payment can't be
 *   duplicated by recording it twice.
 * - Income is counted NET (what reached your account). Gross pay can be noted on the same
 *   record for reference, but it is never added to totals.
 * - Money out has three types:
 *     expense  - counts as spending
 *     refund   - reduces spending in its category
 *     transfer - money moved between your own accounts (e.g. paying off a credit card,
 *                moving money to savings). Not income and not spending.
 *   Card purchases are recorded as expenses when they happen; paying the card bill is a
 *   transfer, so the same spending is never counted twice.
 * - Date rule: everything counts in the month of its date. Dates after today are "expected".
 * - Savings rate = (net income - spending) / net income, for the same month.
 * - Bills and subscriptions are recurring expenses tagged with a bill type, never separate
 *   records, so they can't be counted twice. Marking a payment "paid" only records that you
 *   confirmed it; it doesn't change totals.
 * - Category budgets compare a month's limit with that month's spending (expenses minus
 *   refunds, including scheduled recurring payments still to come).
 *
 * Amounts are decimal strings and all maths uses Decimal, so nothing drifts through rounding.
 */
import { Decimal } from "./decimal.ts";

/* ---------- Categories, frequencies, methods ---------- */

export const INCOME_CATEGORIES = [
  { id: "salary", label: "Employment salary" },
  { id: "self-employment", label: "Self-employment" },
  { id: "freelancing", label: "Freelancing" },
  { id: "business", label: "Business income" },
  { id: "rental", label: "Rental income" },
  { id: "dividends", label: "Dividends" },
  { id: "interest", label: "Interest" },
  { id: "other", label: "Other income" },
] as const;

export type IncomeCategoryId = (typeof INCOME_CATEGORIES)[number]["id"];

export const EXPENSE_CATEGORIES = [
  { id: "housing", label: "Housing" },
  { id: "groceries", label: "Groceries" },
  { id: "utilities", label: "Utilities" },
  { id: "transport", label: "Transport" },
  { id: "dining", label: "Dining" },
  { id: "shopping", label: "Shopping" },
  { id: "entertainment", label: "Entertainment" },
  { id: "travel", label: "Travel" },
  { id: "health", label: "Health" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "insurance", label: "Insurance" },
  { id: "education", label: "Education" },
  { id: "debt", label: "Debt repayments" },
  { id: "misc", label: "Miscellaneous" },
] as const;

export const FREQUENCIES = [
  { id: "once", label: "One-off" },
  { id: "weekly", label: "Weekly" },
  { id: "fortnightly", label: "Every 2 weeks" },
  { id: "four-weekly", label: "Every 4 weeks" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Every 3 months" },
  { id: "yearly", label: "Yearly" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["id"];

export const PAYMENT_METHODS = [
  { id: "", label: "Not specified" },
  { id: "debit-card", label: "Debit card" },
  { id: "credit-card", label: "Credit card" },
  { id: "direct-debit", label: "Direct debit" },
  { id: "standing-order", label: "Standing order" },
  { id: "bank-transfer", label: "Bank transfer" },
  { id: "cash", label: "Cash" },
  { id: "other", label: "Other" },
] as const;

export const EXPENSE_KINDS = [
  { id: "expense", label: "Expense" },
  { id: "refund", label: "Refund" },
  { id: "transfer", label: "Transfer between my accounts" },
] as const;

export type ExpenseKind = (typeof EXPENSE_KINDS)[number]["id"];

/**
 * A bill or subscription is simply a recurring expense with a bill type, so it is stored
 * (and counted) once. The type decides which group it's shown in and suggests a category.
 */
export const BILL_TYPES = [
  { id: "rent-mortgage", label: "Rent or mortgage", group: "bill", category: "housing" },
  { id: "utilities", label: "Utilities", group: "bill", category: "utilities" },
  { id: "insurance", label: "Insurance", group: "bill", category: "insurance" },
  { id: "phone", label: "Phone", group: "bill", category: "utilities" },
  { id: "internet", label: "Internet", group: "bill", category: "utilities" },
  { id: "other-bill", label: "Other bill", group: "bill", category: "misc" },
  { id: "streaming", label: "Streaming", group: "subscription", category: "subscriptions" },
  { id: "gym", label: "Gym", group: "subscription", category: "health" },
  { id: "subscription", label: "Other subscription", group: "subscription", category: "subscriptions" },
] as const;

export type BillTypeId = (typeof BILL_TYPES)[number]["id"];
export type BillGroup = "bill" | "subscription";

export const billTypeOf = (id: string) => BILL_TYPES.find((b) => b.id === id);

/* ---------- Records ---------- */

export interface IncomeRecord {
  id: string;
  name: string;
  /** Net amount received, per payment. */
  amount: string;
  /** Optional gross amount before deductions, for reference only. Never added to totals. */
  gross: string;
  category: IncomeCategoryId;
  /** First (or only) date received, YYYY-MM-DD. */
  date: string;
  frequency: Frequency;
  /** Optional last date for recurring records. "" means no end. */
  endDate: string;
  notes: string;
}

export interface ExpenseRecord {
  id: string;
  kind: ExpenseKind;
  description: string;
  /** Always positive; the kind says which way it counts. */
  amount: string;
  date: string;
  /** A built-in category id or a custom category id ("custom:…"). Ignored for transfers. */
  category: string;
  paymentMethod: string;
  frequency: Frequency;
  endDate: string;
  notes: string;
  /** A BillTypeId when this recurring expense is a bill or subscription; "" otherwise. */
  billType: string;
}

export interface CustomCategory {
  id: string;
  name: string;
}

export interface BudgetData {
  version: 1;
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  customCategories: CustomCategory[];
  /** Monthly spending limits: { "2026-11": { groceries: "300" } }. Each month has its own set. */
  budgets: Record<string, Record<string, string>>;
  /** Bill payments the user has confirmed, as "recordId@YYYY-MM-DD" keys. */
  paidBills: string[];
  /** Money set aside from a month's budget for Savings Vault goals. */
  allocations: SavingsAllocation[];
}

/**
 * planned   - you intend to move this to a savings goal. The Savings Vault is NOT changed.
 * completed - you confirmed the money arrived. Exactly one deposit was added to the goal,
 *             and its id is kept so it can never be added twice.
 */
export interface SavingsAllocation {
  id: string;
  goalId: string;
  /** The goal's name when the allocation was made, shown if the goal is later deleted. */
  goalName: string;
  /** Budget month the money comes from, YYYY-MM. */
  month: string;
  amount: string;
  status: "planned" | "completed";
  /** Set when completed. */
  depositDate: string;
  depositEntryId: string;
}

export const EMPTY_BUDGET: BudgetData = {
  version: 1,
  incomes: [],
  expenses: [],
  customCategories: [],
  budgets: {},
  paidBills: [],
  allocations: [],
};

export function categoryName(id: string, custom: CustomCategory[]): string {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ??
    custom.find((c) => c.id === id)?.name ??
    INCOME_CATEGORIES.find((c) => c.id === id)?.label ??
    "Uncategorised"
  );
}

export const frequencyLabel = (id: Frequency) => FREQUENCIES.find((f) => f.id === id)?.label ?? id;

/* ---------- Calendar dates (no time zones) ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const partsOf = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayNumber = (iso: string) => {
  const [y, m, d] = partsOf(iso);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};
const fromDayNumber = (n: number) => {
  const date = new Date(n * 86_400_000);
  return toISO(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

export function addDaysISO(iso: string, days: number): string {
  return fromDayNumber(dayNumber(iso) + days);
}

/** Same day-of-month `months` later, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = partsOf(iso);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return toISO(year, month, Math.min(d, daysInMonth(year, month)));
}

/** "2026-11" → first and last day of that month. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  return { from: toISO(y, m, 1), to: toISO(y, m, daysInMonth(y, m)) };
}

export const monthOf = (iso: string) => iso.slice(0, 7);

/** "2026-11" shifted by n months. */
export function shiftMonth(month: string, n: number): string {
  return monthOf(addMonthsISO(`${month}-01`, n));
}

const DAY_STEPS: Partial<Record<Frequency, number>> = { weekly: 7, fortnightly: 14, "four-weekly": 28 };
const MONTH_STEPS: Partial<Record<Frequency, number>> = { monthly: 1, quarterly: 3, yearly: 12 };

/**
 * Every date a record falls on between `from` and `to` (inclusive), oldest first.
 * Month-based schedules are always counted from the original date, so a payment on the
 * 31st lands on the last day of shorter months without drifting earlier afterwards.
 */
export function occurrences(start: string, frequency: Frequency, endDate: string, from: string, to: string): string[] {
  const last = endDate && endDate < to ? endDate : to;
  if (start > last) return [];
  if (frequency === "once") return start >= from && start <= last ? [start] : [];

  const dates: string[] = [];
  const dayStep = DAY_STEPS[frequency];
  if (dayStep) {
    const begin = dayNumber(start);
    const skip = Math.max(0, Math.ceil((dayNumber(from) - begin) / dayStep));
    for (let k = skip; ; k++) {
      const date = fromDayNumber(begin + k * dayStep);
      if (date > last) break;
      if (date >= from) dates.push(date);
    }
    return dates;
  }

  const monthStep = MONTH_STEPS[frequency]!;
  const [sy, sm] = partsOf(start);
  const [fy, fm] = partsOf(from);
  const monthsToFrom = (fy - sy) * 12 + (fm - sm);
  const skip = Math.max(0, Math.floor(monthsToFrom / monthStep) - 1);
  for (let k = skip; ; k++) {
    const date = addMonthsISO(start, k * monthStep);
    if (date > last) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

/* ---------- Entries in a period ---------- */

export type EntryType = "income" | "expense" | "refund" | "transfer";

export interface BudgetEntry {
  /** recordId@date: unique per occurrence. */
  key: string;
  recordId: string;
  type: EntryType;
  date: string;
  amount: Decimal;
  label: string;
  category: string;
  recurring: boolean;
  /** Dated after today: expected rather than already happened. */
  expected: boolean;
}

export function entriesBetween(data: BudgetData, from: string, to: string, today: string): BudgetEntry[] {
  const entries: BudgetEntry[] = [];
  for (const r of data.incomes) {
    for (const date of occurrences(r.date, r.frequency, r.endDate, from, to)) {
      entries.push({
        key: `${r.id}@${date}`,
        recordId: r.id,
        type: "income",
        date,
        amount: Decimal.of(r.amount),
        label: r.name,
        category: r.category,
        recurring: r.frequency !== "once",
        expected: date > today,
      });
    }
  }
  for (const r of data.expenses) {
    for (const date of occurrences(r.date, r.frequency, r.endDate, from, to)) {
      entries.push({
        key: `${r.id}@${date}`,
        recordId: r.id,
        type: r.kind,
        date,
        amount: Decimal.of(r.amount),
        label: r.description,
        category: r.kind === "transfer" ? "transfer" : r.category,
        recurring: r.frequency !== "once",
        expected: date > today,
      });
    }
  }
  return entries.sort((a, b) => (a.date === b.date ? a.label.localeCompare(b.label) : a.date < b.date ? -1 : 1));
}

/* ---------- Monthly summary ---------- */

export interface CategoryTotal {
  category: string;
  amount: Decimal;
  /** Share of total spending, 0-100. */
  pct: Decimal;
}

export interface MonthSummary {
  month: string;
  /** Net income dated in the month. */
  income: Decimal;
  /** Expenses minus refunds dated in the month. */
  spending: Decimal;
  /** income - spending. Negative means more went out than came in. */
  remaining: Decimal;
  /** remaining / income x 100. Null when there is no income. */
  savingsRatePct: Decimal | null;
  /** Parts of income and spending dated after today. */
  expectedIncome: Decimal;
  expectedSpending: Decimal;
  /** Money moved between your own accounts. Shown for information, not counted. */
  transfers: Decimal;
  /** Spending by category, largest first; categories whose refunds cancel them out are left out. */
  categories: CategoryTotal[];
}

export function summarizeMonth(data: BudgetData, month: string, today: string): MonthSummary {
  const { from, to } = monthRange(month);
  const entries = entriesBetween(data, from, to, today);

  let income = Decimal.ZERO;
  let spending = Decimal.ZERO;
  let expectedIncome = Decimal.ZERO;
  let expectedSpending = Decimal.ZERO;
  let transfers = Decimal.ZERO;
  const byCategory = new Map<string, Decimal>();

  for (const e of entries) {
    if (e.type === "transfer") {
      transfers = transfers.plus(e.amount);
      continue;
    }
    if (e.type === "income") {
      income = income.plus(e.amount);
      if (e.expected) expectedIncome = expectedIncome.plus(e.amount);
      continue;
    }
    const signed = e.type === "refund" ? e.amount.negated() : e.amount;
    spending = spending.plus(signed);
    if (e.expected) expectedSpending = expectedSpending.plus(signed);
    byCategory.set(e.category, (byCategory.get(e.category) ?? Decimal.ZERO).plus(signed));
  }

  const positiveTotal = Decimal.sum([...byCategory.values()].filter((v) => v.isPositive()));
  const categories = [...byCategory.entries()]
    .filter(([, amount]) => amount.isPositive())
    .map(([category, amount]) => ({
      category,
      amount,
      pct: positiveTotal.isPositive() ? amount.dividedBy(positiveTotal).times(Decimal.HUNDRED) : Decimal.ZERO,
    }))
    .sort((a, b) => b.amount.compare(a.amount));

  const remaining = income.minus(spending);
  return {
    month,
    income,
    spending,
    remaining,
    savingsRatePct: income.isPositive() ? remaining.dividedBy(income).times(Decimal.HUNDRED) : null,
    expectedIncome,
    expectedSpending,
    transfers,
    categories,
  };
}

/** Summaries for `count` months ending with `lastMonth`, oldest first. */
export function monthlyTrend(data: BudgetData, lastMonth: string, count: number, today: string): MonthSummary[] {
  return Array.from({ length: count }, (_, i) => summarizeMonth(data, shiftMonth(lastMonth, i - count + 1), today));
}

/**
 * Recurring payments (expenses only) due from today up to `days` days ahead, soonest first.
 * Bill payments already confirmed as paid are left out.
 */
export function upcomingPayments(data: BudgetData, today: string, days: number): BudgetEntry[] {
  const recurring = { ...data, incomes: [], expenses: data.expenses.filter((e) => e.kind === "expense" && e.frequency !== "once") };
  const paid = new Set(data.paidBills);
  return entriesBetween(recurring, today, addDaysISO(today, days - 1), today).filter((e) => !paid.has(e.key));
}

/* ---------- Bills & subscriptions ---------- */

const PAYMENTS_PER_YEAR: Record<Frequency, number> = {
  once: 0,
  weekly: 52,
  fortnightly: 26,
  "four-weekly": 13,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

/** What a recurring payment costs over a full year at its current amount and frequency. */
export const annualCost = (r: Pick<ExpenseRecord, "amount" | "frequency">) =>
  Decimal.of(r.amount).times(Decimal.of(PAYMENTS_PER_YEAR[r.frequency]));

/** The next payment date on or after today, or null if it has ended. */
export function nextDue(r: Pick<ExpenseRecord, "date" | "frequency" | "endDate">, today: string): string | null {
  return occurrences(r.date, r.frequency, r.endDate, today, addMonthsISO(today, 13))[0] ?? null;
}

export const isBill = (r: ExpenseRecord) => r.kind === "expense" && r.frequency !== "once" && !!billTypeOf(r.billType);

/**
 * paid        - you've confirmed this payment went out
 * due-today   - due today and not confirmed yet
 * upcoming    - due later
 * unconfirmed - the date has passed but you haven't marked it as paid
 *               (it is still counted as spending, because it was scheduled)
 */
export type BillStatus = "paid" | "due-today" | "upcoming" | "unconfirmed";

export function billStatus(key: string, date: string, today: string, paidBills: string[]): BillStatus {
  if (paidBills.includes(key)) return "paid";
  if (date === today) return "due-today";
  return date > today ? "upcoming" : "unconfirmed";
}

export interface BillSummary {
  record: ExpenseRecord;
  group: BillGroup;
  /** Next payment date on or after today; null once it has ended. */
  nextDue: string | null;
  annual: Decimal;
  /** annual / 12: an average month, whatever the frequency. */
  monthly: Decimal;
}

export interface BillsOverview {
  bills: BillSummary[];
  /** Totals cover active bills only (ones with a payment still to come). */
  annualBills: Decimal;
  annualSubscriptions: Decimal;
  annualTotal: Decimal;
  monthlyAverage: Decimal;
}

export function billsOverview(data: BudgetData, today: string): BillsOverview {
  const bills = data.expenses
    .filter(isBill)
    .map((record) => {
      const annual = annualCost(record);
      return {
        record,
        group: billTypeOf(record.billType)!.group as BillGroup,
        nextDue: nextDue(record, today),
        annual,
        monthly: annual.dividedBy(Decimal.of(12)),
      };
    })
    .sort((a, b) => {
      if (a.nextDue === b.nextDue) return a.record.description.localeCompare(b.record.description);
      if (!a.nextDue) return 1;
      if (!b.nextDue) return -1;
      return a.nextDue < b.nextDue ? -1 : 1;
    });
  const active = bills.filter((b) => b.nextDue);
  const annualBills = Decimal.sum(active.filter((b) => b.group === "bill").map((b) => b.annual));
  const annualSubscriptions = Decimal.sum(active.filter((b) => b.group === "subscription").map((b) => b.annual));
  const annualTotal = annualBills.plus(annualSubscriptions);
  return { bills, annualBills, annualSubscriptions, annualTotal, monthlyAverage: annualTotal.dividedBy(Decimal.of(12)) };
}

export interface BillPayment {
  key: string;
  recordId: string;
  date: string;
  label: string;
  amount: Decimal;
  billType: string;
  status: BillStatus;
}

/** Each bill or subscription payment between two dates, with its status, oldest first. */
export function billPaymentsBetween(data: BudgetData, from: string, to: string, today: string): BillPayment[] {
  const bills = { ...data, incomes: [], expenses: data.expenses.filter(isBill) };
  const types = new Map(bills.expenses.map((r) => [r.id, r.billType]));
  return entriesBetween(bills, from, to, today).map((e) => ({
    key: e.key,
    recordId: e.recordId,
    date: e.date,
    label: e.label,
    amount: e.amount,
    billType: types.get(e.recordId) ?? "",
    status: billStatus(e.key, e.date, today, data.paidBills),
  }));
}

/** Past bill payments (up to `days` back) that haven't been marked as paid. */
export function unconfirmedBills(data: BudgetData, today: string, days = 60): BillPayment[] {
  return billPaymentsBetween(data, addDaysISO(today, -days), addDaysISO(today, -1), today).filter((p) => p.status === "unconfirmed");
}

/* ---------- Category budgets ---------- */

/** Spending at or above this share of a limit shows a "close to limit" warning. */
export const NEAR_LIMIT_PCT = 80;

export type BudgetStatus = "ok" | "near" | "over";

export interface BudgetLine {
  category: string;
  allocated: Decimal;
  /** Expenses minus refunds in the category this month (never below zero). */
  spent: Decimal;
  /** allocated - spent. Negative when over budget. */
  remaining: Decimal;
  usedPct: Decimal;
  status: BudgetStatus;
}

export interface BudgetOverview {
  lines: BudgetLine[];
  allocated: Decimal;
  /** Spending in categories that have a budget. */
  spent: Decimal;
  remaining: Decimal;
  /** spent / allocated x 100, or null with no budgets set. */
  usedPct: Decimal | null;
  /** Spending in categories without a budget. */
  unbudgeted: CategoryTotal[];
  unbudgetedTotal: Decimal;
}

export function budgetStatus(spent: Decimal, allocated: Decimal): BudgetStatus {
  if (spent.compare(allocated) > 0) return "over";
  if (!allocated.isPositive()) return "ok";
  return spent.times(Decimal.HUNDRED).compare(allocated.times(Decimal.of(NEAR_LIMIT_PCT))) >= 0 ? "near" : "ok";
}

export function budgetOverview(data: BudgetData, month: string, today: string): BudgetOverview {
  const limits = data.budgets[month] ?? {};
  const spending = new Map(summarizeMonth(data, month, today).categories.map((c) => [c.category, c.amount]));
  const lines = Object.entries(limits)
    .map(([category, amount]) => {
      const allocated = Decimal.of(amount);
      const spent = spending.get(category) ?? Decimal.ZERO;
      return {
        category,
        allocated,
        spent,
        remaining: allocated.minus(spent),
        usedPct: allocated.isPositive() ? spent.dividedBy(allocated).times(Decimal.HUNDRED) : Decimal.ZERO,
        status: budgetStatus(spent, allocated),
      };
    })
    .sort((a, b) => b.usedPct.compare(a.usedPct));
  const allocated = Decimal.sum(lines.map((l) => l.allocated));
  const spent = Decimal.sum(lines.map((l) => l.spent));
  const unbudgeted = summarizeMonth(data, month, today).categories.filter((c) => !(c.category in limits));
  return {
    lines,
    allocated,
    spent,
    remaining: allocated.minus(spent),
    usedPct: allocated.isPositive() ? spent.dividedBy(allocated).times(Decimal.HUNDRED) : null,
    unbudgeted,
    unbudgetedTotal: Decimal.sum(unbudgeted.map((c) => c.amount)),
  };
}

/**
 * Copies one month's limits into the next `count` months, replacing whatever those months had.
 * Returns the new budgets and which target months already had limits (so the user can be asked first).
 */
export function copyBudgets(
  budgets: BudgetData["budgets"],
  fromMonth: string,
  count: number,
): { budgets: BudgetData["budgets"]; replaced: string[] } {
  const source = budgets[fromMonth] ?? {};
  const next = { ...budgets };
  const replaced: string[] = [];
  for (let i = 1; i <= count; i++) {
    const target = shiftMonth(fromMonth, i);
    if (budgets[target] && Object.keys(budgets[target]).length > 0) replaced.push(target);
    next[target] = { ...source };
  }
  return { budgets: next, replaced };
}

/** Checks each limit; blank means "no budget" for that category. */
export function validateBudgetLimits(limits: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [category, text] of Object.entries(limits)) {
    const error = checkAmount(text, "a limit", false);
    if (error) errors[category] = error;
  }
  return errors;
}

/* ---------- Recorded vs scheduled ---------- */

/**
 * recorded  - a one-off entry dated today or earlier, or a bill payment you marked as paid
 * scheduled - worked out from a repeating entry (and not confirmed), or dated in the future
 * Both count towards totals in the same way; this only says how sure the figure is.
 */
export function isRecorded(e: Pick<BudgetEntry, "key" | "date" | "recurring">, data: BudgetData, today: string): boolean {
  if (e.date > today) return false;
  return !e.recurring || data.paidBills.includes(e.key);
}

/* ---------- Cash-flow calendar ---------- */

export interface CalendarEntry extends BudgetEntry {
  recorded: boolean;
}

export interface CalendarDay {
  date: string;
  /** False for the padding days from the previous or next month. */
  inMonth: boolean;
  entries: CalendarEntry[];
  income: Decimal;
  /** Expenses minus refunds. */
  spending: Decimal;
  transfers: Decimal;
}

/** The month as whole Monday-to-Sunday weeks, with every entry on its day. */
export function calendarMonth(data: BudgetData, month: string, today: string): CalendarDay[][] {
  const { from, to } = monthRange(month);
  const weekday = (iso: string) => (new Date(dayNumber(iso) * 86_400_000).getUTCDay() + 6) % 7; // Monday = 0
  const start = addDaysISO(from, -weekday(from));
  const end = addDaysISO(to, 6 - weekday(to));
  const byDate = new Map<string, CalendarEntry[]>();
  for (const e of entriesBetween(data, start, end, today)) {
    const list = byDate.get(e.date) ?? [];
    list.push({ ...e, recorded: isRecorded(e, data, today) });
    byDate.set(e.date, list);
  }
  const weeks: CalendarDay[][] = [];
  for (let date = start; date <= end; date = addDaysISO(date, 1)) {
    if (weekday(date) === 0) weeks.push([]);
    const entries = byDate.get(date) ?? [];
    const sum = (types: EntryType[]) => Decimal.sum(entries.filter((e) => types.includes(e.type)).map((e) => e.amount));
    weeks[weeks.length - 1].push({
      date,
      inMonth: date >= from && date <= to,
      entries,
      income: sum(["income"]),
      spending: sum(["expense"]).minus(sum(["refund"])),
      transfers: sum(["transfer"]),
    });
  }
  return weeks;
}

/* ---------- Analytics ---------- */

export interface BreakdownSlice {
  /** A category id, or "other" for the smaller categories grouped together. */
  category: string;
  amount: Decimal;
  pct: Decimal;
}

/** The largest `max` categories, with any others combined into one "other" slice. */
export function spendingBreakdown(categories: CategoryTotal[], max = 7): BreakdownSlice[] {
  if (categories.length <= max) return categories.map(({ category, amount, pct }) => ({ category, amount, pct }));
  const top = categories.slice(0, max - 1);
  const rest = categories.slice(max - 1);
  return [
    ...top.map(({ category, amount, pct }) => ({ category, amount, pct })),
    { category: "other", amount: Decimal.sum(rest.map((c) => c.amount)), pct: Decimal.sum(rest.map((c) => c.pct)) },
  ];
}

export interface CategoryComparison {
  category: string;
  current: Decimal;
  previous: Decimal;
  /** current - previous. */
  change: Decimal;
  /** Average of the `months` months before the selected one (months with nothing count as £0). */
  average: Decimal;
}

/** Spending per category: this month against last month and against the previous months' average. */
export function categoryComparison(data: BudgetData, month: string, months: number, today: string): CategoryComparison[] {
  const amounts = (m: string) => new Map(summarizeMonth(data, m, today).categories.map((c) => [c.category, c.amount]));
  const current = amounts(month);
  const history = Array.from({ length: months }, (_, i) => amounts(shiftMonth(month, -(i + 1))));
  const previous = history[0] ?? new Map<string, Decimal>();
  const ids = new Set([...current.keys(), ...history.flatMap((h) => [...h.keys()])]);
  return [...ids]
    .map((category) => {
      const now = current.get(category) ?? Decimal.ZERO;
      const before = previous.get(category) ?? Decimal.ZERO;
      const average = months > 0 ? Decimal.sum(history.map((h) => h.get(category) ?? Decimal.ZERO)).dividedBy(Decimal.of(months)) : Decimal.ZERO;
      return { category, current: now, previous: before, change: now.minus(before), average };
    })
    .sort((a, b) => b.current.compare(a.current) || b.average.compare(a.average));
}

/* ---------- Search periods ---------- */

export const SEARCH_PERIODS = [
  { id: "1", label: "This month" },
  { id: "3", label: "Last 3 months" },
  { id: "6", label: "Last 6 months" },
  { id: "12", label: "Last 12 months" },
  { id: "all", label: "All dates" },
] as const;

export type SearchPeriod = (typeof SEARCH_PERIODS)[number]["id"];

/**
 * Date range for a search, ending with the selected month. "all" starts at the earliest
 * record's date, so repeating entries are never searched back before they began.
 */
export function periodRange(data: BudgetData, month: string, period: SearchPeriod): { from: string; to: string } {
  const { to } = monthRange(month);
  if (period === "all") {
    const first = [...data.incomes, ...data.expenses].map((r) => r.date).sort()[0];
    const from = monthRange(month).from;
    return { from: first && first < from ? first : from, to };
  }
  return { from: monthRange(shiftMonth(month, 1 - Number(period))).from, to };
}

/* ---------- Savings allocations ---------- */

export interface SavingsPlan {
  /** Net income minus spending for the month. */
  leftOver: Decimal;
  planned: Decimal;
  completed: Decimal;
  /** leftOver - planned - completed. Negative means more was allocated than was left. */
  unallocated: Decimal;
  allocations: SavingsAllocation[];
}

/** How a month's left-over money is split between savings plans, confirmed deposits and the rest. */
export function savingsPlan(data: BudgetData, month: string, today: string): SavingsPlan {
  const allocations = data.allocations.filter((a) => a.month === month);
  const sum = (status: SavingsAllocation["status"]) =>
    Decimal.sum(allocations.filter((a) => a.status === status).map((a) => Decimal.of(a.amount)));
  const leftOver = summarizeMonth(data, month, today).remaining;
  const planned = sum("planned");
  const completed = sum("completed");
  return { leftOver, planned, completed, unallocated: leftOver.minus(planned).minus(completed), allocations };
}

export function validateAllocation(draft: { goalId: string; amount: string }, goalIds: string[]): { goalId?: string; amount?: string } {
  const errors: { goalId?: string; amount?: string } = {};
  if (!goalIds.includes(draft.goalId)) errors.goalId = "Choose a savings goal.";
  const amount = checkAmount(draft.amount, "an amount", true);
  if (amount) errors.amount = amount;
  return errors;
}

/* ---------- Forms & validation ---------- */

export type IncomeDraft = Omit<IncomeRecord, "id">;
export type ExpenseDraft = Omit<ExpenseRecord, "id">;
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const MAX_AMOUNT = Decimal.of("1000000000");
const isISODate = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));

/** Checks a money field. Returns an error message or undefined. */
export function checkAmount(text: string, what: string, required: boolean): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return required ? `Enter ${what}.` : undefined;
  const value = Decimal.parse(trimmed);
  if (!value) return `Enter ${what} as a number, for example 42.50.`;
  const decimals = (trimmed.replace(/[,\s£]/g, "").split(".")[1] ?? "").replace(/0+$/, "").length;
  if (decimals > 2) return "Use pounds and pence (no more than 2 decimal places).";
  if (!value.isPositive()) return `${what.charAt(0).toUpperCase()}${what.slice(1)} must be more than zero.`;
  if (value.compare(MAX_AMOUNT) > 0) return "That's larger than Dream Vault can track.";
  return undefined;
}

function checkDates(date: string, endDate: string, frequency: Frequency): { date?: string; endDate?: string } {
  const errors: { date?: string; endDate?: string } = {};
  if (!date) errors.date = "Enter a date.";
  else if (!isISODate(date)) errors.date = "Enter a valid date.";
  if (frequency !== "once" && endDate) {
    if (!isISODate(endDate)) errors.endDate = "Enter a valid end date.";
    else if (date && endDate < date) errors.endDate = "The end date can't be before the first date.";
  }
  return errors;
}

export function validateIncome(draft: IncomeDraft): FieldErrors<IncomeDraft> {
  const errors: FieldErrors<IncomeDraft> = {};
  if (!draft.name.trim()) errors.name = "Give this income a name, for example Salary.";
  else if (draft.name.trim().length > 60) errors.name = "Keep the name to 60 characters or fewer.";
  const amount = checkAmount(draft.amount, "the amount you received", true);
  if (amount) errors.amount = amount;
  const gross = checkAmount(draft.gross, "the gross amount", false);
  if (gross) errors.gross = gross;
  else if (!amount && draft.gross.trim() && Decimal.parse(draft.gross)!.compare(Decimal.parse(draft.amount)!) < 0) {
    errors.gross = "Gross pay is before deductions, so it should be at least the amount you received.";
  }
  if (!INCOME_CATEGORIES.some((c) => c.id === draft.category)) errors.category = "Choose a category.";
  if (!FREQUENCIES.some((f) => f.id === draft.frequency)) errors.frequency = "Choose how often it's paid.";
  Object.assign(errors, checkDates(draft.date, draft.endDate, draft.frequency));
  if (draft.notes.length > 200) errors.notes = "Keep notes to 200 characters or fewer.";
  return errors;
}

export function validateExpense(draft: ExpenseDraft, custom: CustomCategory[]): FieldErrors<ExpenseDraft> {
  const errors: FieldErrors<ExpenseDraft> = {};
  if (!EXPENSE_KINDS.some((k) => k.id === draft.kind)) errors.kind = "Choose a type.";
  if (!draft.description.trim()) errors.description = "Describe it, for example Weekly shop.";
  else if (draft.description.trim().length > 60) errors.description = "Keep the description to 60 characters or fewer.";
  const amount = checkAmount(draft.amount, "the amount", true);
  if (amount) errors.amount = amount;
  if (draft.kind !== "transfer") {
    const known = EXPENSE_CATEGORIES.some((c) => c.id === draft.category) || custom.some((c) => c.id === draft.category);
    if (!known) errors.category = "Choose a category.";
  }
  if (!PAYMENT_METHODS.some((p) => p.id === draft.paymentMethod)) errors.paymentMethod = "Choose a payment method.";
  if (!FREQUENCIES.some((f) => f.id === draft.frequency)) errors.frequency = "Choose how often it happens.";
  if (draft.kind === "expense" && draft.billType) {
    if (!billTypeOf(draft.billType)) errors.billType = "Choose a bill type.";
    else if (draft.frequency === "once") errors.frequency = "Bills and subscriptions repeat. Choose how often it's paid.";
  }
  Object.assign(errors, checkDates(draft.date, draft.endDate, draft.frequency));
  if (draft.notes.length > 200) errors.notes = "Keep notes to 200 characters or fewer.";
  return errors;
}

export function validateCategoryName(name: string, custom: CustomCategory[]): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a category name.";
  if (trimmed.length > 30) return "Keep it to 30 characters or fewer.";
  const lower = trimmed.toLowerCase();
  if ([...EXPENSE_CATEGORIES.map((c) => c.label), ...custom.map((c) => c.name)].some((n) => n.toLowerCase() === lower)) {
    return "That category already exists.";
  }
  return undefined;
}

/** Stores amounts in a clean form ("1,250.50" → "1250.5"). Blank optional fields stay blank. */
export const cleanAmount = (text: string) => (text.trim() ? Decimal.of(text.trim()).toString() : "");
