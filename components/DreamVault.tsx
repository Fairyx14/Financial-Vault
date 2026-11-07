"use client";

import { useMemo, useState } from "react";
import { getGoal, type GoalId } from "@/lib/goals";
import { calculatePlan, CURRENCIES, type CurrencyCode } from "@/lib/plan";
import GoalPicker from "./GoalPicker";
import NumberField from "./NumberField";
import Results from "./Results";
import styles from "./DreamVault.module.css";

type Errors = Partial<Record<"target" | "current" | "monthly" | "rate", string>>;

const toNumber = (value: string) => (value.trim() === "" ? NaN : Number(value));

function validate(target: number, current: number, monthly: number, rate: number): Errors {
  const errors: Errors = {};
  if (!Number.isFinite(target) || target <= 0) errors.target = "Enter a target amount above zero.";
  if (!Number.isFinite(current) || current < 0) errors.current = "Enter your current savings (0 is fine).";
  if (!Number.isFinite(monthly) || monthly < 0) errors.monthly = "Enter a monthly amount (0 is fine).";
  if (!Number.isFinite(rate) || rate < 0 || rate > 20) errors.rate = "Enter a rate between 0 and 20%.";
  return errors;
}

export default function DreamVault() {
  const [goalId, setGoalId] = useState<GoalId>("home");
  const [customName, setCustomName] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("GBP");
  const [target, setTarget] = useState("50000");
  const [current, setCurrent] = useState("8000");
  const [monthly, setMonthly] = useState("750");
  const [rate, setRate] = useState("0");

  const numbers = {
    target: toNumber(target),
    current: toNumber(current),
    monthly: toNumber(monthly),
    rate: toNumber(rate),
  };
  const errors = validate(numbers.target, numbers.current, numbers.monthly, numbers.rate);
  const isValid = Object.keys(errors).length === 0;

  const plan = useMemo(
    () =>
      isValid
        ? calculatePlan({
            target: numbers.target,
            current: numbers.current,
            monthly: numbers.monthly,
            annualRate: numbers.rate,
          })
        : null,
    [isValid, numbers.target, numbers.current, numbers.monthly, numbers.rate],
  );

  const goal = getGoal(goalId);
  const goalName = goalId === "custom" ? customName.trim() || "Your dream" : goal.name;
  const symbol = CURRENCIES[currency].symbol;

  return (
    <div className={styles.layout}>
      <form className={styles.planner} onSubmit={(event) => event.preventDefault()} noValidate aria-label="Goal planner">
        <GoalPicker value={goalId} onChange={setGoalId} />

        {goalId === "custom" && (
          <div className={`${styles.field} ${styles.customName}`}>
            <label htmlFor="custom-name" className={styles.label}>
              What are you saving for?
            </label>
            <div className={styles.inputWrap}>
              <input
                id="custom-name"
                type="text"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="e.g. A home studio"
                maxLength={40}
                autoComplete="off"
                className={styles.input}
              />
            </div>
          </div>
        )}

        <fieldset className={styles.fieldset}>
          <legend className={styles.stepLegend}>
            <span className={styles.stepNumber} aria-hidden="true">02</span>
            Set the numbers
          </legend>

          <div className={styles.field}>
            <label htmlFor="currency" className={styles.label}>
              Currency
            </label>
            <div className={`${styles.inputWrap} ${styles.selectWrap}`}>
              <select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                className={styles.input}
              >
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                  <option key={code} value={code}>
                    {CURRENCIES[code].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <NumberField
              id="target"
              label="Target amount"
              value={target}
              onChange={setTarget}
              prefix={symbol}
              step={100}
              error={errors.target}
            />
            <NumberField
              id="current"
              label="Current savings"
              value={current}
              onChange={setCurrent}
              prefix={symbol}
              step={100}
              error={errors.current}
            />
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
      </form>

      <Results
        plan={plan}
        goalName={goalName}
        target={numbers.target}
        current={numbers.current}
        currency={currency}
        hasGrowth={numbers.rate > 0}
      />
    </div>
  );
}
