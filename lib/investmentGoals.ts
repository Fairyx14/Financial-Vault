/**
 * Investment goals: targets you're working towards, projected with your own assumptions.
 * A goal only reads the tracker (to find your current value); it never changes holdings.
 */
import { Decimal } from "./decimal.ts";
import type { PortfolioSummary } from "./investments.ts";
import { readNumber, RULES } from "./projections.ts";

export const GOAL_PRESETS = [
  { id: "100k", label: "Build a £100,000 portfolio", target: "100000" },
  { id: "250k", label: "Reach £250,000 in investments", target: "250000" },
  { id: "retirement", label: "Save towards retirement", target: "" },
  { id: "long-term", label: "Build a long-term investment fund", target: "" },
  { id: "custom", label: "Create a custom goal", target: "" },
] as const;

export type GoalPreset = (typeof GOAL_PRESETS)[number]["id"];

/** Where the goal's starting value comes from. */
export type GoalSource = "portfolio" | "holdings" | "manual";

export interface InvestmentGoal {
  id: string;
  preset: GoalPreset;
  name: string;
  target: string;
  source: GoalSource;
  /** Used when source is "holdings". */
  holdingIds: string[];
  /** Used when source is "manual". */
  manualAmount: string;
  monthly: string;
  returnPct: string;
  createdAt: string;
}

export type GoalDraft = Omit<InvestmentGoal, "id" | "createdAt">;

export const EMPTY_GOAL: GoalDraft = {
  preset: "100k",
  name: "Build a £100,000 portfolio",
  target: "100000",
  source: "portfolio",
  holdingIds: [],
  manualAmount: "",
  monthly: "",
  returnPct: "5",
};

/** The goal's current value: your whole portfolio, chosen holdings, or an amount you typed. */
export function goalCurrentValue(goal: GoalDraft, portfolio: PortfolioSummary): Decimal {
  if (goal.source === "portfolio") return portfolio.valueGBP;
  if (goal.source === "holdings") {
    return Decimal.sum(
      portfolio.holdings.filter((h) => goal.holdingIds.includes(h.investment.id)).map((h) => h.summary.valueGBP),
    );
  }
  return Decimal.parse(goal.manualAmount) ?? Decimal.ZERO;
}

export type GoalErrors = Partial<Record<keyof GoalDraft, string>>;

export function validateGoal(goal: GoalDraft): GoalErrors {
  const errors: GoalErrors = {};
  const name = goal.name.trim();
  if (!name) errors.name = "Give your goal a name.";
  else if (name.length > 60) errors.name = "Keep the name to 60 characters or fewer.";

  const check = (field: keyof GoalDraft, result: { error?: string }) => {
    if (result.error) errors[field] = result.error;
  };
  check("target", readNumber(goal.target, { what: "the target amount", required: true, ...RULES.target }));
  check("monthly", readNumber(goal.monthly, { what: "the monthly contribution", required: false, ...RULES.amount }));
  check("returnPct", readNumber(goal.returnPct, { what: "the assumed yearly growth", required: true, ...RULES.returnPct }));
  if (goal.source === "manual") {
    check("manualAmount", readNumber(goal.manualAmount, { what: "the current amount", required: true, ...RULES.amount }));
  }
  if (goal.source === "holdings" && goal.holdingIds.length === 0) errors.holdingIds = "Choose at least one holding.";
  return errors;
}
