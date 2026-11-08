"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTransaction,
  createInvestment,
  recordPrice,
  removeTransaction,
  updateDetails,
  upsertTransaction,
  type Investment,
  type InvestmentDraft,
  type TransactionDraft,
} from "@/lib/investments";
import { newId, todayISO } from "@/lib/vault";

/**
 * Investments live in their own localStorage key, separate from savings goals,
 * so the two vaults can never overwrite each other's data.
 */
const STORAGE_KEY = "dream-vault:investments:v1";

interface InvestmentState {
  version: 1;
  investments: Investment[];
}

function load(): InvestmentState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InvestmentState>;
      if (parsed?.version === 1 && Array.isArray(parsed.investments)) return { version: 1, investments: parsed.investments };
    }
  } catch {
    // Unreadable or blocked storage: start empty.
  }
  return { version: 1, investments: [] };
}

function save(state: InvestmentState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function useInvestments() {
  const [state, setState] = useState<InvestmentState | null>(null);
  const [storageWorks, setStorageWorks] = useState(true);

  useEffect(() => {
    setState(load());
  }, []);

  useEffect(() => {
    if (state) setStorageWorks(save(state));
  }, [state]);

  const actions = useMemo(() => {
    const update = (change: (list: Investment[]) => Investment[]) =>
      setState((current) => (current ? { ...current, investments: change(current.investments) } : current));

    return {
      /** Returns the new investment's id. */
      add(draft: InvestmentDraft): string {
        const investment = createInvestment(draft, todayISO(), newId);
        update((list) => [...list, investment]);
        return investment.id;
      },
      /** Name, ticker, category and account only. */
      editDetails(id: string, draft: InvestmentDraft) {
        update((list) => list.map((item) => (item.id === id ? updateDetails(item, draft) : item)));
      },
      /** Adds a transaction, or replaces one when `editingId` is given. Validate first. */
      saveTransaction(id: string, draft: TransactionDraft, editingId?: string) {
        update((list) =>
          list.map((item) =>
            item.id === id ? upsertTransaction(item, buildTransaction(draft, item.currency, editingId ?? newId())) : item,
          ),
        );
      },
      /** Returns an explanation if the entry can't be deleted safely. */
      deleteTransaction(investment: Investment, transactionId: string): string | undefined {
        const result = removeTransaction(investment, transactionId);
        const next = result.investment;
        if (!next) return result.error;
        update((list) => list.map((item) => (item.id === investment.id ? next : item)));
        return undefined;
      },
      remove(id: string) {
        update((list) => list.filter((item) => item.id !== id));
      },
      updatePrice(id: string, price: { date: string; price: string; fxRate: string }) {
        update((list) => list.map((item) => (item.id === id ? recordPrice(item, price, newId) : item)));
      },
    };
  }, []);

  return { investments: state?.investments ?? null, storageWorks, ...actions };
}
