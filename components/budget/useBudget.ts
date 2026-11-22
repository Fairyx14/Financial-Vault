"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cleanAmount,
  copyBudgets,
  EMPTY_BUDGET,
  type BudgetData,
  type ExpenseDraft,
  type IncomeDraft,
  type SavingsAllocation,
} from "@/lib/budget";
import { writeVault } from "@/lib/localStore";
import { newId } from "@/lib/vault";

/** Budget data has its own storage key, so it can never overwrite Savings or Investment data. */
const STORAGE_KEY = "dream-vault:budget:v1";

function load(): BudgetData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BudgetData>;
      if (parsed?.version === 1) {
        return {
          version: 1,
          incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
          // Records saved before bills existed have no billType; treat them as ordinary expenses.
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses.map((e) => ({ ...e, billType: e.billType ?? "" })) : [],
          customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
          budgets: parsed.budgets && typeof parsed.budgets === "object" ? parsed.budgets : {},
          paidBills: Array.isArray(parsed.paidBills) ? parsed.paidBills : [],
          allocations: Array.isArray(parsed.allocations) ? parsed.allocations : [],
        };
      }
    }
  } catch {
    // Unreadable or blocked storage: start empty.
  }
  return EMPTY_BUDGET;
}

const tidyIncome = (d: IncomeDraft): IncomeDraft => ({
  ...d,
  name: d.name.trim(),
  amount: cleanAmount(d.amount),
  gross: cleanAmount(d.gross),
  endDate: d.frequency === "once" ? "" : d.endDate,
  notes: d.notes.trim(),
});

const tidyExpense = (d: ExpenseDraft): ExpenseDraft => ({
  ...d,
  description: d.description.trim(),
  amount: cleanAmount(d.amount),
  category: d.kind === "transfer" ? "" : d.category,
  endDate: d.frequency === "once" ? "" : d.endDate,
  notes: d.notes.trim(),
  billType: d.kind === "expense" && d.frequency !== "once" ? d.billType : "",
});

export function useBudget() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [storageWorks, setStorageWorks] = useState(true);

  useEffect(() => {
    setData(load());
    // If the Budget Vault is changed in another tab, pick that up instead of overwriting it later.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setData(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!data) return;
    setStorageWorks(writeVault(STORAGE_KEY, JSON.stringify(data)));
  }, [data]);

  const actions = useMemo(() => {
    const update = (change: (d: BudgetData) => BudgetData) => setData((d) => (d ? change(d) : d));
    return {
      addIncome(draft: IncomeDraft) {
        update((d) => ({ ...d, incomes: [...d.incomes, { ...tidyIncome(draft), id: newId() }] }));
      },
      editIncome(id: string, draft: IncomeDraft) {
        update((d) => ({ ...d, incomes: d.incomes.map((r) => (r.id === id ? { ...tidyIncome(draft), id } : r)) }));
      },
      deleteIncome(id: string) {
        update((d) => ({ ...d, incomes: d.incomes.filter((r) => r.id !== id) }));
      },
      addExpense(draft: ExpenseDraft) {
        update((d) => ({ ...d, expenses: [...d.expenses, { ...tidyExpense(draft), id: newId() }] }));
      },
      editExpense(id: string, draft: ExpenseDraft) {
        update((d) => ({ ...d, expenses: d.expenses.map((r) => (r.id === id ? { ...tidyExpense(draft), id } : r)) }));
      },
      deleteExpense(id: string) {
        update((d) => ({
          ...d,
          expenses: d.expenses.filter((r) => r.id !== id),
          paidBills: d.paidBills.filter((key) => !key.startsWith(`${id}@`)),
        }));
      },
      /** Records (or un-records) that one bill payment went out. Doesn't change any totals. */
      setBillPaid(key: string, paid: boolean) {
        update((d) => ({
          ...d,
          paidBills: paid ? [...d.paidBills.filter((k) => k !== key), key] : d.paidBills.filter((k) => k !== key),
        }));
      },
      /** Replaces one month's limits. Blank amounts are dropped; an empty set removes the month. */
      setMonthBudgets(month: string, limits: Record<string, string>) {
        update((d) => {
          const clean = Object.fromEntries(
            Object.entries(limits)
              .filter(([, v]) => v.trim())
              .map(([k, v]) => [k, cleanAmount(v)]),
          );
          const budgets = { ...d.budgets };
          if (Object.keys(clean).length) budgets[month] = clean;
          else delete budgets[month];
          return { ...d, budgets };
        });
      },
      /** Plans money for a savings goal. Doesn't touch the Savings Vault. */
      addAllocation(month: string, goalId: string, goalName: string, amount: string) {
        update((d) => ({
          ...d,
          allocations: [
            ...d.allocations,
            { id: newId(), goalId, goalName, month, amount: cleanAmount(amount), status: "planned", depositDate: "", depositEntryId: "" },
          ],
        }));
      },
      replaceAllocation(allocation: SavingsAllocation) {
        update((d) => ({ ...d, allocations: d.allocations.map((a) => (a.id === allocation.id ? allocation : a)) }));
      },
      deleteAllocation(id: string) {
        update((d) => ({ ...d, allocations: d.allocations.filter((a) => a.id !== id) }));
      },
      /** Copies a month's limits into the following `count` months, replacing theirs. */
      copyMonthBudgets(month: string, count: number) {
        update((d) => ({ ...d, budgets: copyBudgets(d.budgets, month, count).budgets }));
      },
      /** Adds a custom spending category and returns its id. */
      addCategory(name: string): string {
        const id = `custom:${newId()}`;
        update((d) => ({ ...d, customCategories: [...d.customCategories, { id, name: name.trim() }] }));
        return id;
      },
    };
  }, []);

  return { data, storageWorks, ...actions };
}
