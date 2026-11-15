"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Decimal } from "@/lib/decimal";
import { savingsPlan, validateAllocation, type BudgetData, type SavingsAllocation } from "@/lib/budget";
import { confirmDeposit, undoDeposit } from "@/lib/savingsLink";
import { currentBalance, formatDay, loadVault, saveVault, type VaultState } from "@/lib/vault";
import type { ConfirmRequest } from "../ConfirmDialog";
import Field from "../investments/Field";
import { money, signedMoney } from "../investments/format";
import MonthPicker, { monthLabel } from "./MonthPicker";
import planner from "../DreamVault.module.css";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import styles from "./budget.module.css";

interface SavingsViewProps {
  data: BudgetData;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
  onAdd: (goalId: string, goalName: string, amount: string) => void;
  onReplace: (allocation: SavingsAllocation) => void;
  onDelete: (id: string) => void;
  onConfirm: (request: ConfirmRequest) => void;
  onAnnounce: (text: string) => void;
}

/** The Savings Vault, read fresh from storage and kept current if it changes in another tab. */
function useSavingsVault() {
  const [state, setState] = useState<VaultState | null>(null);
  useEffect(() => {
    setState(loadVault());
    const onStorage = (event: StorageEvent) => event.key === "dream-vault:v1" && setState(loadVault());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return [state, setState] as const;
}

export default function SavingsView(props: SavingsViewProps) {
  const { data, month, today, onMonthChange, onAdd, onReplace, onDelete, onConfirm, onAnnounce } = props;
  const [savings, setSavings] = useSavingsVault();
  const plan = useMemo(() => savingsPlan(data, month, today), [data, month, today]);
  const [goalId, setGoalId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [depositDate, setDepositDate] = useState(today);
  const [error, setError] = useState<string>();

  const goals = savings?.goals ?? [];
  const gbp = !savings || savings.currency === "GBP";
  const chosenGoal = goals.find((g) => g.id === goalId) ?? goals[0];
  const errors = validateAllocation({ goalId: chosenGoal?.id ?? "", amount }, goals.map((g) => g.id));
  const valid = Object.keys(errors).length === 0;
  const parsed = Decimal.parse(amount);
  const overLeft = parsed && !errors.amount && parsed.compare(plan.unallocated) > 0;

  const add = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || !chosenGoal) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#savings-form [aria-invalid="true"]')?.focus());
      return;
    }
    onAdd(chosenGoal.id, chosenGoal.name, amount);
    onAnnounce(`${money(Decimal.of(amount))} planned for ${chosenGoal.name}. Your Savings Vault hasn't been changed.`);
    setAmount("");
    setSubmitted(false);
  };

  /** Reads the Savings Vault fresh, adds one deposit, saves it, then marks the allocation done. */
  const confirm = (allocation: SavingsAllocation) => {
    const latest = loadVault();
    const result = confirmDeposit(latest.goals, allocation, depositDate, today);
    if (!result.ok) return setError(result.reason);
    if (!saveVault({ ...latest, goals: result.goals })) {
      return setError("Your browser didn't let Dream Vault save the deposit, so nothing was changed.");
    }
    setSavings({ ...latest, goals: result.goals });
    onReplace(result.allocation);
    setConfirming(null);
    setError(undefined);
    onAnnounce(`${money(Decimal.of(allocation.amount))} added to ${allocation.goalName} in your Savings Vault.`);
    setTimeout(() => document.getElementById("allocations-title")?.focus(), 0);
  };

  const undo = (allocation: SavingsAllocation) =>
    onConfirm({
      title: "Undo this deposit?",
      message: `This removes the ${money(Decimal.of(allocation.amount))} deposit from “${allocation.goalName}” in your Savings Vault and marks it as planned again.`,
      confirmLabel: "Undo deposit",
      onConfirm: () => {
        const latest = loadVault();
        const result = undoDeposit(latest.goals, allocation);
        if (result.removed && !saveVault({ ...latest, goals: result.goals })) return;
        setSavings({ ...latest, goals: result.goals });
        onReplace(result.allocation);
        onAnnounce(result.removed ? "Deposit removed from your Savings Vault." : "Marked as planned. The deposit had already been removed from your Savings Vault.");
      },
    });

  const remove = (allocation: SavingsAllocation) =>
    onConfirm({
      title: "Delete this allocation?",
      message:
        allocation.status === "completed"
          ? "This deletes the record here only. The deposit stays in your Savings Vault; delete it there if you need to."
          : "This plan will be removed. Your Savings Vault isn't affected.",
      confirmLabel: "Delete",
      onConfirm: () => {
        onDelete(allocation.id);
        onAnnounce("Allocation deleted.");
        setTimeout(() => document.getElementById("allocations-title")?.focus(), 0);
      },
    });

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            Savings
          </h2>
          <p className={vault.viewSubtitle}>Plan what to set aside from {monthLabel(month)} for your Savings Vault goals.</p>
        </div>
        <div className={styles.toolbarRight}>
          <MonthPicker month={month} onChange={onMonthChange} />
        </div>
      </div>

      <dl className={`${inv.tiles} ${styles.tiles4}`}>
        <div className={inv.tile}>
          <dt>Left this month</dt>
          <dd className={plan.leftOver.isNegative() ? inv.negative : undefined}>{signedMoney(plan.leftOver)}</dd>
          <dd className={inv.tileNote}>Net income minus spending</dd>
        </div>
        <div className={inv.tile}>
          <dt>Planned</dt>
          <dd>{money(plan.planned)}</dd>
          <dd className={inv.tileNote}>Not yet moved</dd>
        </div>
        <div className={inv.tile}>
          <dt>Deposited</dt>
          <dd className={inv.positive}>{money(plan.completed)}</dd>
          <dd className={inv.tileNote}>Confirmed and added to goals</dd>
        </div>
        <div className={inv.tile}>
          <dt>Not allocated</dt>
          <dd className={plan.unallocated.isNegative() ? inv.negative : undefined}>{signedMoney(plan.unallocated)}</dd>
          <dd className={inv.tileNote}>{plan.unallocated.isNegative() ? "More planned than is left" : "Still free this month"}</dd>
        </div>
      </dl>

      {!gbp ? (
        <div className={vault.emptyState}>
          <h3 className={vault.emptyTitle}>Your Savings Vault uses a different currency</h3>
          <p className={vault.emptyText}>
            The Budget Vault works in pounds (GBP), and your Savings Vault is set to {savings?.currency}. To avoid mixing
            currencies, linking is only available when both use GBP.
          </p>
        </div>
      ) : savings && goals.length === 0 ? (
        <div className={vault.emptyState}>
          <span className={vault.emptyIcon}>
            <Icon paths={["M19 7h-3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z", "M12 11v5", "M9.5 13.5h5"]} size={28} />
          </span>
          <h3 className={vault.emptyTitle}>No savings goals yet</h3>
          <p className={vault.emptyText}>Create a goal in the Savings Vault, such as a house deposit, then come back to plan money for it.</p>
          <Link href="/vault" className={vault.buttonPrimary}>
            Open the Savings Vault
          </Link>
        </div>
      ) : (
        <div className={styles.dashGrid}>
          <section className={vault.card} aria-labelledby="plan-title">
            <h3 id="plan-title" className={vault.cardTitle}>
              Plan a savings allocation
            </h3>
            <p className={vault.muted}>
              Planning doesn&rsquo;t move any money or change your goal. When the money has actually reached your savings,
              confirm it below and it&rsquo;s added to the goal once.
            </p>
            <form id="savings-form" className={styles.allocForm} onSubmit={add} noValidate>
              <div className={planner.field}>
                <label htmlFor="alloc-goal" className={planner.label}>
                  Savings goal
                </label>
                <div className={`${planner.inputWrap} ${planner.selectWrap}`}>
                  <select id="alloc-goal" className={planner.input} value={chosenGoal?.id ?? ""} onChange={(e) => setGoalId(e.target.value)}>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} · {money(Decimal.of(currentBalance(g).toFixed(2)))} of {money(Decimal.of(g.target.toFixed(2)))}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Field
                id="alloc-amount"
                label="Amount"
                inputMode="decimal"
                prefix="£"
                value={amount}
                onChange={setAmount}
                error={submitted ? errors.amount : undefined}
                hint={
                  overLeft
                    ? `That's more than the ${money(plan.unallocated.isNegative() ? Decimal.ZERO : plan.unallocated)} not yet allocated this month. You can still plan it.`
                    : `${money(plan.unallocated.isNegative() ? Decimal.ZERO : plan.unallocated)} not yet allocated in ${monthLabel(month)}.`
                }
                placeholder="e.g. 500"
              />
              <button type="submit" className={vault.buttonPrimary}>
                Plan allocation
              </button>
            </form>
          </section>

          <section className={vault.card} aria-labelledby="allocations-title">
            <h3 id="allocations-title" tabIndex={-1} className={vault.cardTitle}>
              {monthLabel(month)} allocations
            </h3>
            {plan.allocations.length === 0 ? (
              <p className={vault.muted}>Nothing planned for {monthLabel(month)} yet.</p>
            ) : (
              <ul className={styles.allocList}>
                {plan.allocations.map((a) => {
                  const goal = goals.find((g) => g.id === a.goalId);
                  const open = confirming === a.id;
                  return (
                    <li key={a.id}>
                      <div className={styles.allocRow}>
                        <span className={styles.entryMain}>
                          <span className={styles.entryLabel}>{goal?.name ?? a.goalName}</span>
                          <span className={styles.entryMeta}>
                            <span className={`${styles.statusChip} ${a.status === "completed" ? styles.chip_ok : styles.bill_upcoming}`}>
                              {a.status === "completed" ? "Deposited" : "Planned"}
                            </span>
                            {a.status === "completed" && `Added on ${formatDay(a.depositDate)}`}
                            {!goal && " · goal no longer in your Savings Vault"}
                          </span>
                        </span>
                        <strong className={styles.entryAmount}>{money(Decimal.of(a.amount))}</strong>
                        <span className={styles.allocActions}>
                          {a.status === "planned" && goal && !open && (
                            <button
                              type="button"
                              className={vault.buttonSecondary}
                              onClick={() => {
                                setConfirming(a.id);
                                setDepositDate(today);
                                setError(undefined);
                                setTimeout(() => document.getElementById(`deposit-date-${a.id}`)?.focus(), 0);
                              }}
                            >
                              Confirm deposit
                            </button>
                          )}
                          {a.status === "completed" && (
                            <button type="button" className={vault.buttonGhost} onClick={() => undo(a)}>
                              Undo
                            </button>
                          )}
                          <button type="button" className={vault.iconButton} onClick={() => remove(a)} aria-label={`Delete ${a.goalName} allocation of ${money(Decimal.of(a.amount))}`} title="Delete">
                            <Icon paths={["M4 7h16", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} size={16} />
                          </button>
                        </span>
                      </div>
                      {open && goal && (
                        <div className={styles.confirmPanel} role="group" aria-label={`Confirm deposit to ${goal.name}`}>
                          <p>
                            Has <strong>{money(Decimal.of(a.amount))}</strong> actually reached your savings for <strong>{goal.name}</strong>?
                            Confirming adds one deposit to the goal in your Savings Vault.
                          </p>
                          <div className={styles.confirmRow}>
                            <Field
                              id={`deposit-date-${a.id}`}
                              type="date"
                              label="Date it arrived"
                              value={depositDate}
                              onChange={setDepositDate}
                              error={error}
                            />
                            <button type="button" className={vault.buttonPrimary} onClick={() => confirm(a)}>
                              Yes, add {money(Decimal.of(a.amount))} to {goal.name}
                            </button>
                            <button type="button" className={vault.buttonGhost} onClick={() => setConfirming(null)}>
                              Not yet
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <p className={styles.helpNote}>
        <strong>How this works:</strong> a <em>planned</em> allocation is just a note of what you intend to save; your goal
        isn&rsquo;t changed. A <em>deposit</em> is added to the goal only when you confirm the money arrived, and only once.
        Allocations don&rsquo;t change your spending or savings rate, and you don&rsquo;t need to record a separate transfer
        for them.
      </p>
    </section>
  );
}
