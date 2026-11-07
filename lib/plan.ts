/**
 * Savings-plan maths for Dream Vault.
 *
 * Model: contributions are added at the end of each month and any growth
 * compounds monthly, so after n months the balance is
 *   B(n) = C·(1+r)^n + M·((1+r)^n − 1) / r      (or C + M·n when r = 0)
 */

/** Plans longer than this (100 years) are treated as out of reach. */
export const MAX_MONTHS = 1200;

export type CurrencyCode = "GBP" | "USD" | "EUR" | "INR" | "CAD" | "AUD";

export const CURRENCIES: Record<CurrencyCode, { label: string; locale: string; symbol: string }> = {
  GBP: { label: "British pound (£)", locale: "en-GB", symbol: "£" },
  USD: { label: "US dollar ($)", locale: "en-US", symbol: "$" },
  EUR: { label: "Euro (€)", locale: "en-IE", symbol: "€" },
  INR: { label: "Indian rupee (₹)", locale: "en-IN", symbol: "₹" },
  CAD: { label: "Canadian dollar ($)", locale: "en-CA", symbol: "$" },
  AUD: { label: "Australian dollar ($)", locale: "en-AU", symbol: "$" },
};

export interface PlanInput {
  target: number;
  current: number;
  monthly: number;
  /** Expected yearly growth, as a percentage (e.g. 4 for 4%). */
  annualRate: number;
}

export interface Milestone {
  /** Fraction of the target, e.g. 0.25. */
  fraction: number;
  /** Months from today, 0 if already passed, null if never reached. */
  months: number | null;
}

export type PlanStatus = "reached" | "on-track" | "out-of-reach";

export interface Plan {
  status: PlanStatus;
  /** Months until the goal is reached (null when out of reach). */
  months: number | null;
  /** Share of the target already saved, 0–1. */
  progress: number;
  remaining: number;
  /** Total of all future monthly contributions until the goal. */
  contributions: number;
  /** Growth earned on top of contributions until the goal. */
  growth: number;
  milestones: Milestone[];
  /** Suggestion: a slightly larger contribution and the months it saves. */
  tip: { extra: number; monthsSaved: number } | null;
}

const monthlyRate = (annualRate: number) => annualRate / 100 / 12;

export function balanceAfter(months: number, { current, monthly, annualRate }: PlanInput): number {
  const r = monthlyRate(annualRate);
  if (r === 0) return current + monthly * months;
  const growthFactor = Math.pow(1 + r, months);
  return current * growthFactor + (monthly * (growthFactor - 1)) / r;
}

/** Whole months needed to reach `goal`, or null if it can't be reached within MAX_MONTHS. */
export function monthsToReach(goal: number, input: PlanInput): number | null {
  const { current, monthly, annualRate } = input;
  if (current >= goal) return 0;

  const r = monthlyRate(annualRate);
  let months: number;

  if (r === 0) {
    if (monthly <= 0) return null;
    months = Math.ceil((goal - current) / monthly);
  } else {
    const denominator = current * r + monthly;
    if (denominator <= 0) return null;
    const exact = Math.log((goal * r + monthly) / denominator) / Math.log(1 + r);
    // Small epsilon so floating-point noise doesn't add a whole extra month.
    months = Math.ceil(exact - 1e-9);
  }

  return months > MAX_MONTHS ? null : Math.max(months, 1);
}

/** A friendly round number roughly 10% of the monthly contribution. */
function suggestedExtra(monthly: number): number {
  const raw = Math.max(monthly * 0.1, 25);
  const step = raw >= 500 ? 100 : raw >= 100 ? 50 : raw >= 50 ? 10 : 5;
  return Math.ceil(raw / step) * step;
}

export function calculatePlan(input: PlanInput): Plan {
  const { target, current, monthly } = input;
  const months = monthsToReach(target, input);
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  const remaining = Math.max(target - current, 0);

  const milestones: Milestone[] = [0.25, 0.5, 0.75, 1].map((fraction) => ({
    fraction,
    months: monthsToReach(target * fraction, input),
  }));

  if (months === 0) {
    return { status: "reached", months: 0, progress: 1, remaining: 0, contributions: 0, growth: 0, milestones, tip: null };
  }

  if (months === null) {
    return { status: "out-of-reach", months: null, progress, remaining, contributions: 0, growth: 0, milestones, tip: null };
  }

  const contributions = monthly * months;
  const growth = Math.max(balanceAfter(months, input) - current - contributions, 0);

  let tip: Plan["tip"] = null;
  if (months > 1) {
    const extra = suggestedExtra(monthly);
    const faster = monthsToReach(target, { ...input, monthly: monthly + extra });
    if (faster !== null && faster < months) tip = { extra, monthsSaved: months - faster };
  }

  return { status: "on-track", months, progress, remaining, contributions, growth, milestones, tip };
}

/* ---------- Formatting helpers ---------- */

export function formatMoney(value: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** Short form for chart axes, e.g. "£50K". */
export function formatMoneyCompact(value: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (rest) parts.push(`${rest} ${rest === 1 ? "month" : "months"}`);
  return parts.join(" and ") || "less than a month";
}

/** "March 2029" for a date `months` from `from`. Fixed locale avoids server/client mismatch. */
export function formatMonthsFromNow(months: number, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth() + months, 1);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}
