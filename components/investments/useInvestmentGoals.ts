"use client";

import { useEffect, useMemo, useState } from "react";
import type { GoalDraft, InvestmentGoal } from "@/lib/investmentGoals";
import { newId, todayISO } from "@/lib/vault";

/** Goals have their own storage key, separate from holdings, so projections can never change records. */
const STORAGE_KEY = "dream-vault:investment-goals:v1";

function load(): InvestmentGoal[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { version?: number; goals?: InvestmentGoal[] };
      if (parsed?.version === 1 && Array.isArray(parsed.goals)) return parsed.goals;
    }
  } catch {
    // Unreadable or blocked storage: start empty.
  }
  return [];
}

export function useInvestmentGoals() {
  const [goals, setGoals] = useState<InvestmentGoal[] | null>(null);

  useEffect(() => {
    setGoals(load());
  }, []);

  useEffect(() => {
    if (!goals) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, goals }));
    } catch {
      // The Investment Vault already warns when storage is blocked.
    }
  }, [goals]);

  const actions = useMemo(
    () => ({
      addGoal(draft: GoalDraft): string {
        const id = newId();
        setGoals((list) => [...(list ?? []), { ...draft, name: draft.name.trim(), id, createdAt: todayISO() }]);
        return id;
      },
      editGoal(id: string, draft: GoalDraft) {
        setGoals((list) => (list ?? []).map((g) => (g.id === id ? { ...g, ...draft, name: draft.name.trim() } : g)));
      },
      deleteGoal(id: string) {
        setGoals((list) => (list ?? []).filter((g) => g.id !== id));
      },
    }),
    [],
  );

  return { goals, ...actions };
}
