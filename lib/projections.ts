/**
 * Hypothetical growth projections for the Investment Vault's planning tools.
 * Nothing here reads or changes recorded holdings; it only does arithmetic on the
 * assumptions you type in. All maths uses Decimal, so nothing drifts through rounding.
 *
 * METHOD (the same monthly compounding the Savings Vault uses)
 *   monthly rate        r = annual return ÷ 12        (e.g. 6% a year → 0.5% a month)
 *   each month          balance = balance × (1 + r) + that month's contribution
 *                       (contributions are added at the end of the month)
 *   contribution rise   in year y the monthly amount is  monthly × (1 + increase)^(y − 1)
 *   inflation           a value after y years is shown in today's money as
 *                       value ÷ (1 + inflation)^y
 * Negative returns are allowed (down to −50% a year) and simply shrink the balance.
 */
import { Decimal } from "./decimal.ts";

const TWELVE = Decimal.of("12");
const pctToRate = (pct: Decimal) => pct.dividedBy(Decimal.HUNDRED);

/** (1 + rate)^n for a whole number n, by repeated multiplication (exact enough for money). */
function grow(rate: Decimal, n: number): Decimal {
  let factor = Decimal.ONE;
  const step = Decimal.ONE.plus(rate);
  for (let i = 0; i < n; i++) factor = factor.times(step);
  return factor;
}

/* ---------- Growth calculator ---------- */

export interface ProjectionInput {
  start: Decimal;
  monthly: Decimal;
  annualReturnPct: Decimal;
  years: number;
  /** Yearly rise in the monthly contribution, e.g. 3 for 3%. */
  contributionIncreasePct: Decimal;
  /** Yearly inflation used for "today's money" figures. */
  inflationPct: Decimal;
}

export interface ProjectionYear {
  year: number;
  /** Starting amount plus every contribution so far. */
  contributed: Decimal;
  value: Decimal;
  /** value − contributed. Negative when returns are negative. */
  growth: Decimal;
  /** value in today's money. Equal to value when inflation is 0. */
  realValue: Decimal;
}

export interface Projection {
  /** Year 0 (today) to the final year. */
  years: ProjectionYear[];
  finalValue: Decimal;
  contributed: Decimal;
  growth: Decimal;
  realFinalValue: Decimal;
}

export function project(input: ProjectionInput): Projection {
  const monthlyRate = pctToRate(input.annualReturnPct).dividedBy(TWELVE);
  const growthFactor = Decimal.ONE.plus(monthlyRate);
  const increase = pctToRate(input.contributionIncreasePct);
  const inflation = pctToRate(input.inflationPct);

  let balance = input.start;
  let contributed = input.start;
  const years: ProjectionYear[] = [
    { year: 0, contributed, value: balance, growth: Decimal.ZERO, realValue: balance },
  ];

  let contribution = input.monthly;
  for (let year = 1; year <= input.years; year++) {
    if (year > 1) contribution = contribution.times(Decimal.ONE.plus(increase));
    for (let month = 0; month < 12; month++) {
      balance = balance.times(growthFactor).plus(contribution);
      contributed = contributed.plus(contribution);
    }
    years.push({
      year,
      contributed,
      value: balance,
      growth: balance.minus(contributed),
      realValue: balance.dividedBy(grow(inflation, year)),
    });
  }

  const last = years[years.length - 1];
  return { years, finalValue: last.value, contributed: last.contributed, growth: last.growth, realFinalValue: last.realValue };
}

/* ---------- Investment goals ---------- */

/** Projections stop at 100 years; anything longer is treated as out of reach. */
export const GOAL_MAX_MONTHS = 1200;

export interface GoalInput {
  current: Decimal;
  target: Decimal;
  monthly: Decimal;
  annualReturnPct: Decimal;
}

export interface GoalMilestone {
  /** 0.25, 0.5, 0.75 or 1 */
  fraction: number;
  /** Months from now; 0 if already passed; null if not reached within 100 years. */
  months: number | null;
}

export type GoalStatus = "reached" | "reachable" | "unreachable";

export interface GoalProjection {
  status: GoalStatus;
  /** Months until the target; null when unreachable. */
  months: number | null;
  /** Share of the target already held, 0–100 (capped at 100). */
  progressPct: Decimal;
  milestones: GoalMilestone[];
  /**
   * Why a goal is unreachable:
   *  "no-growth"  nothing is being added and nothing grows, so the balance never moves
   *  "levels-off" with a negative return the balance settles at `ceiling` and can't climb past it
   *  "too-long"   it would take more than 100 years
   */
  reason?: "no-growth" | "levels-off" | "too-long";
  ceiling?: Decimal;
}

const FRACTIONS = [0.25, 0.5, 0.75, 1];

export function projectGoal(input: GoalInput): GoalProjection {
  const { current, target, monthly } = input;
  const progressPct = target.isPositive()
    ? Decimal.HUNDRED.compare(current.dividedBy(target).times(Decimal.HUNDRED)) < 0
      ? Decimal.HUNDRED
      : current.dividedBy(target).times(Decimal.HUNDRED)
    : Decimal.ZERO;

  const goals = FRACTIONS.map((fraction) => target.times(Decimal.of(String(fraction))));
  const milestones: GoalMilestone[] = goals.map((amount, i) => ({
    fraction: FRACTIONS[i],
    months: current.compare(amount) >= 0 ? 0 : null,
  }));

  if (current.compare(target) >= 0) return { status: "reached", months: 0, progressPct, milestones };

  const rate = pctToRate(input.annualReturnPct).dividedBy(TWELVE);

  // Nothing added and no positive growth: the balance can never rise.
  if (!monthly.isPositive() && !rate.isPositive()) {
    return { status: "unreachable", months: null, progressPct, milestones, reason: "no-growth" };
  }
  // A negative return with contributions settles where growth losses equal contributions.
  // The target can't be reached if that level is at or below it, but earlier milestones still can.
  const ceiling = rate.isNegative() ? monthly.dividedBy(rate.negated()) : undefined;
  const levelsOff = ceiling !== undefined && ceiling.compare(target) <= 0;

  const factor = Decimal.ONE.plus(rate);
  let balance = current;
  for (let month = 1; month <= GOAL_MAX_MONTHS; month++) {
    balance = balance.times(factor).plus(monthly);
    milestones.forEach((m, i) => {
      if (m.months === null && balance.compare(goals[i]) >= 0) m.months = month;
    });
    if (balance.compare(target) >= 0) return { status: "reachable", months: month, progressPct, milestones };
  }
  return levelsOff
    ? { status: "unreachable", months: null, progressPct, milestones, reason: "levels-off", ceiling }
    : { status: "unreachable", months: null, progressPct, milestones, reason: "too-long" };
}

/* ---------- Validation ---------- */

/** Parses a field, returning the value or an error message. Blank optional fields count as 0. */
export function readNumber(
  text: string,
  rule: { what: string; min: number; max: number; decimals: number; required: boolean; integer?: boolean },
): { value: Decimal; error?: undefined } | { value?: undefined; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return rule.required ? { error: `Enter ${rule.what}.` } : { value: Decimal.ZERO };
  const value = Decimal.parse(trimmed);
  if (!value) return { error: `Enter ${rule.what} as a number.` };
  const decimals = (trimmed.replace(/[,\s£$€%]/g, "").split(".")[1] ?? "").replace(/0+$/, "").length;
  if (rule.integer && decimals > 0) return { error: `Use a whole number for ${rule.what}.` };
  if (decimals > rule.decimals) return { error: `Use no more than ${rule.decimals} decimal places.` };
  if (value.compare(Decimal.of(String(rule.min))) < 0 || value.compare(Decimal.of(String(rule.max))) > 0) {
    return { error: `${rule.what.charAt(0).toUpperCase()}${rule.what.slice(1)} must be between ${rule.min.toLocaleString("en-GB")} and ${rule.max.toLocaleString("en-GB")}.` };
  }
  return { value };
}

export const RULES = {
  amount: { min: 0, max: 1_000_000_000, decimals: 2 },
  target: { min: 1, max: 1_000_000_000, decimals: 2 },
  years: { min: 1, max: 60, decimals: 0, integer: true },
  returnPct: { min: -50, max: 50, decimals: 2 },
  increasePct: { min: 0, max: 20, decimals: 2 },
  inflationPct: { min: 0, max: 20, decimals: 2 },
} as const;
