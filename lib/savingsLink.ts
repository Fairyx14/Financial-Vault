/**
 * Moving a planned Budget Vault allocation into a Savings Vault goal.
 *
 * Kept free of browser code so it can be tested. The rules:
 * - Nothing touches the Savings Vault until the user confirms a deposit happened.
 * - Confirming adds exactly ONE entry to the goal and remembers its id on the allocation.
 *   Confirming again (double click, second tab, stale page) changes nothing.
 * - Undoing removes only that entry, and only if it is still there.
 */
import type { SavingsAllocation } from "./budget.ts";

/** The parts of a Savings Vault goal this module needs. */
export interface LinkedGoal {
  id: string;
  name: string;
  entries: { id: string; date: string; amount: number; note: string; starting?: boolean }[];
}

export type DepositResult<G extends LinkedGoal> =
  | { ok: true; goals: G[]; allocation: SavingsAllocation }
  | { ok: false; reason: string };

const monthName = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));

/** One fixed entry id per allocation, so the same allocation can never create two deposits. */
export const depositEntryId = (allocation: Pick<SavingsAllocation, "id">) => `budget-${allocation.id}`;

export const depositNote = (allocation: Pick<SavingsAllocation, "month">) => `From Budget Vault (${monthName(allocation.month)})`;

export function confirmDeposit<G extends LinkedGoal>(
  goals: G[],
  allocation: SavingsAllocation,
  date: string,
  today: string,
): DepositResult<G> {
  const entryId = depositEntryId(allocation);
  if (allocation.status === "completed") return { ok: false, reason: "This deposit has already been added to your goal." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: "Enter the date the money arrived." };
  if (date > today) return { ok: false, reason: "The deposit date can't be in the future. Confirm it once the money has arrived." };
  const goal = goals.find((g) => g.id === allocation.goalId);
  if (!goal) return { ok: false, reason: "That savings goal no longer exists in your Savings Vault." };
  if (goal.entries.some((e) => e.id === entryId)) return { ok: false, reason: "This deposit has already been added to your goal." };

  const entry = { id: entryId, date, amount: Number(allocation.amount), note: depositNote(allocation) };
  return {
    ok: true,
    goals: goals.map((g) => (g.id === goal.id ? { ...g, entries: [...g.entries, entry] } : g)),
    allocation: { ...allocation, status: "completed", depositDate: date, depositEntryId: entryId },
  };
}

/** Takes a confirmed deposit back out of the goal and returns the allocation to "planned". */
export function undoDeposit<G extends LinkedGoal>(goals: G[], allocation: SavingsAllocation): { goals: G[]; allocation: SavingsAllocation; removed: boolean } {
  let removed = false;
  const next = goals.map((g) => {
    if (g.id !== allocation.goalId) return g;
    const entries = g.entries.filter((e) => e.id !== allocation.depositEntryId);
    removed = entries.length !== g.entries.length;
    return removed ? { ...g, entries } : g;
  });
  return { goals: next, allocation: { ...allocation, status: "planned", depositDate: "", depositEntryId: "" }, removed };
}
