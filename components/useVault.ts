"use client";

import { useEffect, useMemo, useState } from "react";
import type { CurrencyCode } from "@/lib/plan";
import {
  loadVault,
  newId,
  saveVault,
  todayISO,
  type Entry,
  type GoalDraft,
  type SavedGoal,
  type VaultState,
} from "@/lib/vault";

/** Vault state, loaded from and saved to localStorage, plus the actions that change it. */
export function useVault() {
  // null until the browser has been read, so the server render and first client render match.
  const [vault, setVault] = useState<VaultState | null>(null);
  const [storageWorks, setStorageWorks] = useState(true);

  useEffect(() => {
    setVault(loadVault());
  }, []);

  useEffect(() => {
    if (vault) setStorageWorks(saveVault(vault));
  }, [vault]);

  const actions = useMemo(() => {
    const updateGoals = (change: (goals: SavedGoal[]) => SavedGoal[]) =>
      setVault((state) => (state ? { ...state, goals: change(state.goals) } : state));

    const updateGoal = (goalId: string, change: (goal: SavedGoal) => SavedGoal) =>
      updateGoals((goals) => goals.map((goal) => (goal.id === goalId ? change(goal) : goal)));

    return {
      setCurrency(currency: CurrencyCode) {
        setVault((state) => (state ? { ...state, currency } : state));
      },

      /** Creates a goal and returns its id. */
      addGoal(draft: GoalDraft, startingSavings: number): string {
        const id = newId();
        const today = todayISO();
        const entries: Entry[] =
          startingSavings > 0
            ? [{ id: newId(), date: today, amount: startingSavings, note: "Starting balance", starting: true }]
            : [];
        updateGoals((goals) => [...goals, { ...draft, id, createdAt: today, entries }]);
        return id;
      },

      editGoal(goalId: string, draft: GoalDraft) {
        updateGoal(goalId, (goal) => ({ ...goal, ...draft }));
      },

      deleteGoal(goalId: string) {
        updateGoals((goals) => goals.filter((goal) => goal.id !== goalId));
      },

      addEntry(goalId: string, entry: Omit<Entry, "id">) {
        updateGoal(goalId, (goal) => ({ ...goal, entries: [...goal.entries, { ...entry, id: newId() }] }));
      },

      deleteEntry(goalId: string, entryId: string) {
        updateGoal(goalId, (goal) => ({ ...goal, entries: goal.entries.filter((entry) => entry.id !== entryId) }));
      },
    };
  }, []);

  return { vault, storageWorks, ...actions };
}
