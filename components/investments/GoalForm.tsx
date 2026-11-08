"use client";

import { useState, type FormEvent } from "react";
import { Decimal } from "@/lib/decimal";
import {
  EMPTY_GOAL,
  GOAL_PRESETS,
  goalCurrentValue,
  validateGoal,
  type GoalDraft,
  type GoalSource,
} from "@/lib/investmentGoals";
import type { PortfolioSummary } from "@/lib/investments";
import { projectGoal } from "@/lib/projections";
import Field from "./Field";
import { GoalOutlook } from "./Goals";
import { money } from "./format";
import planner from "../DreamVault.module.css";
import vault from "../Vault.module.css";
import styles from "./planning.module.css";

interface GoalFormProps {
  initial?: GoalDraft;
  portfolio: PortfolioSummary;
  onSubmit: (draft: GoalDraft) => void;
}

export default function GoalForm({ initial, portfolio, onSubmit }: GoalFormProps) {
  const isEdit = Boolean(initial);
  const [draft, setDraft] = useState<GoalDraft>(initial ?? EMPTY_GOAL);
  const [submitted, setSubmitted] = useState(false);
  const errors = validateGoal(draft);
  const valid = Object.keys(errors).length === 0;
  const show = (field: keyof GoalDraft) => (submitted ? errors[field] : undefined);
  const set = (field: keyof GoalDraft) => (value: string) => setDraft((d) => ({ ...d, [field]: value }));

  const held = portfolio.holdings.filter((h) => h.summary.quantity.isPositive());
  const current = goalCurrentValue(draft, portfolio);
  const preview = valid
    ? projectGoal({
        current,
        target: Decimal.of(draft.target.replace(/[,\s£]/g, "")),
        monthly: Decimal.parse(draft.monthly) ?? Decimal.ZERO,
        annualReturnPct: Decimal.of(draft.returnPct.replace(/[%\s]/g, "")),
      })
    : null;

  const choosePreset = (id: GoalDraft["preset"]) => {
    const preset = GOAL_PRESETS.find((p) => p.id === id)!;
    setDraft((d) => {
      // Replace the name and target only if they still match the previous preset (i.e. weren't customised).
      const previous = GOAL_PRESETS.find((p) => p.id === d.preset);
      const nameUntouched = !d.name.trim() || d.name === previous?.label;
      const targetUntouched = !d.target.trim() || d.target === previous?.target;
      return {
        ...d,
        preset: id,
        name: nameUntouched ? (id === "custom" ? "" : preset.label) : d.name,
        target: targetUntouched ? preset.target : d.target,
      };
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSubmit({ ...draft, holdingIds: draft.source === "holdings" ? draft.holdingIds : [] });
  };

  return (
    <section aria-labelledby="view-title">
      <a href="#/goals" className={vault.backLink}>
        ← All goals
      </a>
      <h2 id="view-title" tabIndex={-1} data-view-heading className={`${vault.viewTitle} ${vault.formTitle}`}>
        {isEdit ? `Edit ${initial!.name}` : "New investment goal"}
      </h2>

      <div className={planner.layout}>
        <form className={planner.planner} onSubmit={submit} noValidate aria-labelledby="view-title">
          <fieldset className={planner.fieldset}>
            <legend className={planner.stepLegend}>
              <span className={planner.stepNumber} aria-hidden="true">01</span>
              What are you aiming for?
            </legend>
            <div className={styles.presetGrid}>
              {GOAL_PRESETS.map((preset) => (
                <label key={preset.id} className={`${styles.preset} ${draft.preset === preset.id ? styles.presetActive : ""}`}>
                  <input
                    type="radio"
                    name="goal-preset"
                    value={preset.id}
                    checked={draft.preset === preset.id}
                    onChange={() => choosePreset(preset.id)}
                    className="visually-hidden"
                  />
                  {preset.label}
                </label>
              ))}
            </div>
            <Field id="goal-name" label="Goal name" value={draft.name} onChange={set("name")} error={show("name")} maxLength={60} placeholder="e.g. House fund" />
            <Field id="goal-target" label="Target amount" inputMode="decimal" prefix="£" value={draft.target} onChange={set("target")} error={show("target")} placeholder="e.g. 400000" />
          </fieldset>

          <fieldset className={planner.fieldset}>
            <legend className={planner.stepLegend}>
              <span className={planner.stepNumber} aria-hidden="true">02</span>
              Where are you starting from?
            </legend>
            <div className={styles.sourceList} role="radiogroup" aria-label="Starting value">
              {(
                [
                  ["portfolio", `My whole portfolio (${money(portfolio.valueGBP)})`],
                  ["holdings", "Selected holdings"],
                  ["manual", "An amount I'll enter"],
                ] as [GoalSource, string][]
              ).map(([source, label]) => (
                <label key={source} className={styles.sourceOption}>
                  <input
                    type="radio"
                    name="goal-source"
                    checked={draft.source === source}
                    onChange={() => setDraft((d) => ({ ...d, source }))}
                  />
                  {label}
                </label>
              ))}
            </div>

            {draft.source === "holdings" && (
              <fieldset className={styles.holdingPicker} aria-describedby={show("holdingIds") ? "goal-holdings-error" : undefined}>
                <legend className="visually-hidden">Holdings to include</legend>
                {held.length === 0 ? (
                  <p className={planner.hint}>You don&rsquo;t hold any investments yet.</p>
                ) : (
                  held.map((h) => (
                    <label key={h.investment.id} className={styles.sourceOption}>
                      <input
                        type="checkbox"
                        checked={draft.holdingIds.includes(h.investment.id)}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            holdingIds: e.target.checked
                              ? [...d.holdingIds, h.investment.id]
                              : d.holdingIds.filter((id) => id !== h.investment.id),
                          }))
                        }
                      />
                      {h.investment.name} <span className={styles.sourceValue}>{money(h.summary.valueGBP)}</span>
                    </label>
                  ))
                )}
                {show("holdingIds") && (
                  <p id="goal-holdings-error" className={planner.error}>
                    {show("holdingIds")}
                  </p>
                )}
              </fieldset>
            )}

            {draft.source === "manual" && (
              <Field id="goal-manual" label="Current amount" inputMode="decimal" prefix="£" value={draft.manualAmount} onChange={set("manualAmount")} error={show("manualAmount")} />
            )}
            {draft.source !== "manual" && (
              <p className={planner.hint}>
                Uses the latest prices in your tracker, so this goal updates as you record prices. It never changes your holdings.
              </p>
            )}
          </fieldset>

          <fieldset className={planner.fieldset}>
            <legend className={planner.stepLegend}>
              <span className={planner.stepNumber} aria-hidden="true">03</span>
              Your assumptions
            </legend>
            <div className={planner.fieldGrid}>
              <Field
                id="goal-monthly"
                label={<>Monthly contribution <span className={vault.optional}>(optional)</span></>}
                inputMode="decimal"
                prefix="£"
                value={draft.monthly}
                onChange={set("monthly")}
                error={show("monthly")}
                placeholder="0"
              />
              <Field
                id="goal-return"
                label="Assumed yearly growth"
                inputMode="decimal"
                suffix="%"
                value={draft.returnPct}
                onChange={set("returnPct")}
                error={show("returnPct")}
                hint="An assumption, not a promise. Can be 0 or negative."
              />
            </div>
          </fieldset>

          <div className={vault.formActions}>
            <button type="submit" className={vault.buttonPrimary}>
              {isEdit ? "Save changes" : "Save goal"}
            </button>
            <a href="#/goals" className={vault.buttonGhost}>
              Cancel
            </a>
            {submitted && !valid && (
              <p className={vault.formError} role="alert">
                Please fix the highlighted fields.
              </p>
            )}
          </div>
        </form>

        <aside className={styles.goalPreview} aria-labelledby="goal-preview-title">
          <p className={styles.previewEyebrow}>Preview · hypothetical</p>
          <h3 id="goal-preview-title" className={styles.previewTitle}>
            {draft.name.trim() || "Your goal"}
          </h3>
          <p className={styles.previewLine}>
            Starting from <strong>{money(current)}</strong>
          </p>
          {preview ? (
            <GoalOutlook projection={preview} monthly={Decimal.parse(draft.monthly) ?? Decimal.ZERO} returnPct={draft.returnPct} />
          ) : (
            <p className={styles.previewLine}>Fill in the target and assumptions to see an estimate.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
