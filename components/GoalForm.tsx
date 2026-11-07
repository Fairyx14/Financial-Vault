"use client";

import { useMemo, useState, type FormEvent } from "react";
import { getGoal, type GoalId } from "@/lib/goals";
import { calculatePlan, CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/plan";
import type { GoalDraft } from "@/lib/vault";
import GoalPicker from "./GoalPicker";
import NumberField from "./NumberField";
import Results from "./Results";
import planner from "./DreamVault.module.css";
import styles from "./Vault.module.css";

type Errors = Partial<Record<"target" | "current" | "monthly" | "rate", string>>;

const toNumber = (value: string) => (value.trim() === "" ? NaN : Number(value));

function validate(target: number, current: number, monthly: number, rate: number, checkCurrent: boolean): Errors {
  const errors: Errors = {};
  if (!Number.isFinite(target) || target <= 0) errors.target = "Enter a target amount above zero.";
  if (checkCurrent && (!Number.isFinite(current) || current < 0)) errors.current = "Enter your current savings (0 is fine).";
  if (!Number.isFinite(monthly) || monthly < 0) errors.monthly = "Enter a monthly amount (0 is fine).";
  if (!Number.isFinite(rate) || rate < 0 || rate > 20) errors.rate = "Enter a rate between 0 and 20%.";
  return errors;
}

interface GoalFormProps {
  mode: "create" | "edit";
  currency: CurrencyCode;
  /** Existing values when editing. */
  initial?: GoalDraft;
  /** Saved balance when editing (savings change through deposits, not here). */
  balance?: number;
  cancelHref: string;
  onSubmit: (draft: GoalDraft, startingSavings: number) => void;
}

export default function GoalForm({ mode, currency, initial, balance = 0, cancelHref, onSubmit }: GoalFormProps) {
  const isEdit = mode === "edit";
  const [type, setType] = useState<GoalId>(initial?.type ?? "home");
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(String(initial?.target ?? 50000));
  const [current, setCurrent] = useState("8000");
  const [monthly, setMonthly] = useState(String(initial?.monthly ?? 750));
  const [rate, setRate] = useState(String(initial?.annualRate ?? 0));
  const [submitted, setSubmitted] = useState(false);

  const numbers = {
    target: toNumber(target),
    current: isEdit ? Math.max(balance, 0) : toNumber(current),
    monthly: toNumber(monthly),
    rate: toNumber(rate),
  };
  const errors = validate(numbers.target, numbers.current, numbers.monthly, numbers.rate, !isEdit);
  const isValid = Object.keys(errors).length === 0;

  const plan = useMemo(
    () =>
      isValid
        ? calculatePlan({ target: numbers.target, current: numbers.current, monthly: numbers.monthly, annualRate: numbers.rate })
        : null,
    [isValid, numbers.target, numbers.current, numbers.monthly, numbers.rate],
  );

  const typeName = getGoal(type).name;
  const goalName = name.trim() || typeName;
  const symbol = CURRENCIES[currency].symbol;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isValid) {
      document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    onSubmit(
      { type, name: goalName, target: numbers.target, monthly: numbers.monthly, annualRate: numbers.rate },
      isEdit ? 0 : numbers.current,
    );
  };

  return (
    <section aria-labelledby="view-title">
      <a href={cancelHref} className={styles.backLink}>
        ← {isEdit ? "Back to goal" : "All goals"}
      </a>
      <h2 id="view-title" tabIndex={-1} data-view-heading className={`${styles.viewTitle} ${styles.formTitle}`}>
        {isEdit ? `Edit ${initial?.name ?? "goal"}` : "Add a new goal"}
      </h2>

      <div className={planner.layout}>
        <form className={planner.planner} onSubmit={submit} noValidate aria-labelledby="view-title">
          <GoalPicker value={type} onChange={setType} />

          <fieldset className={planner.fieldset}>
            <legend className={planner.stepLegend}>
              <span className={planner.stepNumber} aria-hidden="true">02</span>
              Set the numbers
            </legend>

            <div className={planner.field}>
              <label htmlFor="goal-name" className={planner.label}>
                Goal name <span className={styles.optional}>(optional)</span>
              </label>
              <div className={planner.inputWrap}>
                <input
                  id="goal-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={type === "custom" ? "e.g. A home studio" : typeName}
                  maxLength={40}
                  autoComplete="off"
                  className={planner.input}
                />
              </div>
            </div>

            <div className={planner.fieldGrid}>
              <NumberField
                id="target"
                label="Target amount"
                value={target}
                onChange={setTarget}
                prefix={symbol}
                step={100}
                error={errors.target}
              />
              {isEdit ? (
                <div className={planner.field}>
                  <p className={planner.label}>Current savings</p>
                  <p className={styles.readonlyValue}>{formatMoney(balance, currency)}</p>
                  <p className={planner.hint}>To change this, log a deposit or withdrawal on the goal page.</p>
                </div>
              ) : (
                <NumberField
                  id="current"
                  label="Current savings"
                  value={current}
                  onChange={setCurrent}
                  prefix={symbol}
                  step={100}
                  error={errors.current}
                />
              )}
              <NumberField
                id="monthly"
                label="Monthly contribution"
                value={monthly}
                onChange={setMonthly}
                prefix={symbol}
                step={10}
                error={errors.monthly}
              />
              <NumberField
                id="rate"
                label="Expected yearly growth"
                hint="Optional. Leave at 0 for a plain savings pot."
                value={rate}
                onChange={setRate}
                suffix="%"
                step={0.5}
                max={20}
                error={errors.rate}
              />
            </div>
          </fieldset>

          <div className={styles.formActions}>
            <button type="submit" className={styles.buttonPrimary}>
              {isEdit ? "Save changes" : "Add to my vault"}
            </button>
            <a href={cancelHref} className={styles.buttonGhost}>
              Cancel
            </a>
            {submitted && !isValid && (
              <p className={styles.formError} role="alert">
                Please fix the highlighted fields.
              </p>
            )}
          </div>
        </form>

        <Results
          plan={plan}
          eyebrow="Preview"
          title={goalName}
          target={numbers.target}
          current={numbers.current}
          currency={currency}
          hasGrowth={numbers.rate > 0}
        />
      </div>
    </section>
  );
}
