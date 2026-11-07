/**
 * Saved goals and their savings history.
 *
 * Everything lives in the browser's localStorage, so nothing leaves the device.
 * A goal's current balance is the sum of its entries (deposits are positive,
 * withdrawals negative). The savings someone starts with is stored as the first
 * entry, flagged `starting`, so the original plan can be rebuilt later.
 */
import type { GoalId } from "./goals";
import { balanceAfter, calculatePlan, type CurrencyCode, type Plan, type PlanInput } from "./plan";

export interface Entry {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Positive for a deposit, negative for a withdrawal. */
  amount: number;
  note: string;
  /** True for the balance entered when the goal was created. */
  starting?: boolean;
}

export interface SavedGoal {
  id: string;
  type: GoalId;
  name: string;
  target: number;
  monthly: number;
  annualRate: number;
  /** YYYY-MM-DD */
  createdAt: string;
  entries: Entry[];
}

/** The editable parts of a goal. */
export type GoalDraft = Pick<SavedGoal, "type" | "name" | "target" | "monthly" | "annualRate">;

export interface VaultState {
  version: 1;
  currency: CurrencyCode;
  goals: SavedGoal[];
}

const STORAGE_KEY = "dream-vault:v1";

export const EMPTY_VAULT: VaultState = { version: 1, currency: "GBP", goals: [] };

export function loadVault(): VaultState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_VAULT;
    const parsed = JSON.parse(raw) as Partial<VaultState>;
    if (parsed?.version === 1 && Array.isArray(parsed.goals)) {
      return { version: 1, currency: parsed.currency ?? "GBP", goals: parsed.goals };
    }
  } catch {
    // Unreadable or blocked storage: start fresh.
  }
  return EMPTY_VAULT;
}

/** Returns false when the browser refuses to store data (private mode, full disk…). */
export function saveVault(state: VaultState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------- Dates (local calendar days, no time zones) ---------- */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const todayISO = () => toISODate(new Date());

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Same day-of-month n months later, clamped to the month's last day. */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

/** Completed months between two dates (0 if `to` is earlier). */
export function wholeMonthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(months, 0);
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    parseISODate(iso),
  );
}

/* ---------- Balances, forecast and pace ---------- */

export const currentBalance = (goal: SavedGoal) => goal.entries.reduce((sum, entry) => sum + entry.amount, 0);

export function balanceOn(goal: SavedGoal, date: Date): number {
  const iso = toISODate(date);
  return goal.entries.reduce((sum, entry) => (entry.date <= iso ? sum + entry.amount : sum), 0);
}

export const startingBalance = (goal: SavedGoal) =>
  goal.entries.reduce((sum, entry) => (entry.starting ? sum + entry.amount : sum), 0);

/** The plan as it was set when the goal was created, starting from the opening balance. */
export function originalPlanInput(goal: SavedGoal): PlanInput {
  return { target: goal.target, current: startingBalance(goal), monthly: goal.monthly, annualRate: goal.annualRate };
}

/** Forecast from today's balance. */
export function forecastFor(goal: SavedGoal): Plan {
  return calculatePlan({
    target: goal.target,
    current: Math.max(currentBalance(goal), 0),
    monthly: goal.monthly,
    annualRate: goal.annualRate,
  });
}

/** Where the plan expected the balance to be after `months` full months. */
export const plannedBalance = (goal: SavedGoal, months: number) =>
  Math.min(balanceAfter(months, originalPlanInput(goal)), goal.target);

export type PaceStatus = "reached" | "ahead" | "on-track" | "behind";

export interface Pace {
  status: PaceStatus;
  /** What the plan expected by today. */
  expected: number;
  /** Actual minus expected. */
  difference: number;
}

export function paceFor(goal: SavedGoal, today: Date = new Date()): Pace {
  const actual = currentBalance(goal);
  if (actual >= goal.target) return { status: "reached", expected: goal.target, difference: actual - goal.target };

  const elapsed = wholeMonthsBetween(parseISODate(goal.createdAt), today);
  const expected = plannedBalance(goal, elapsed);
  const difference = actual - expected;
  // Small differences (under 5% of a monthly payment) count as on track.
  const tolerance = Math.max(1, goal.monthly * 0.05);

  const status: PaceStatus = Math.abs(difference) < tolerance ? "on-track" : difference > 0 ? "ahead" : "behind";
  return { status, expected, difference };
}
