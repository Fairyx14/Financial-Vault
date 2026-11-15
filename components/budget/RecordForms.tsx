"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  BILL_TYPES,
  billTypeOf,
  EXPENSE_CATEGORIES,
  EXPENSE_KINDS,
  FREQUENCIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  validateCategoryName,
  validateExpense,
  validateIncome,
  type CustomCategory,
  type ExpenseDraft,
  type ExpenseKind,
  type Frequency,
  type IncomeDraft,
} from "@/lib/budget";
import Field from "../investments/Field";
import planner from "../DreamVault.module.css";
import vault from "../Vault.module.css";
import styles from "./budget.module.css";

/* ---------- Shared bits ---------- */

function Select({
  id,
  label,
  value,
  onChange,
  options,
  error,
  hint,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  error?: string;
  hint?: string;
}) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={planner.field}>
      <label htmlFor={id} className={planner.label}>
        {label}
      </label>
      <div className={`${planner.inputWrap} ${planner.selectWrap} ${error ? planner.inputWrapError : ""}`}>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={planner.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hint && (
        <p id={`${id}-hint`} className={planner.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={planner.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function FormShell({
  title,
  backHref,
  backLabel,
  onSubmit,
  submitLabel,
  showErrorSummary,
  children,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  showErrorSummary: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="view-title">
      <a href={backHref} className={vault.backLink}>
        ← {backLabel}
      </a>
      <h2 id="view-title" tabIndex={-1} data-view-heading className={`${vault.viewTitle} ${vault.formTitle}`}>
        {title}
      </h2>
      <form className={`${planner.planner} ${styles.form}`} onSubmit={onSubmit} noValidate aria-labelledby="view-title">
        {children}
        <div className={vault.formActions}>
          <button type="submit" className={vault.buttonPrimary}>
            {submitLabel}
          </button>
          <a href={backHref} className={vault.buttonGhost}>
            Cancel
          </a>
          {showErrorSummary && (
            <p className={vault.formError} role="alert">
              Please fix the highlighted fields.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

const focusFirstError = () =>
  requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

const frequencyOptions = FREQUENCIES.map((f) => ({ id: f.id as string, label: f.label }));

/* ---------- Income ---------- */

export function IncomeForm({ initial, today, onSubmit }: { initial?: IncomeDraft; today: string; onSubmit: (d: IncomeDraft) => void }) {
  const [draft, setDraft] = useState<IncomeDraft>(
    initial ?? { name: "", amount: "", gross: "", category: "salary", date: today, frequency: "monthly", endDate: "", notes: "" },
  );
  const [submitted, setSubmitted] = useState(false);
  const errors = validateIncome(draft);
  const valid = Object.keys(errors).length === 0;
  const show = (f: keyof IncomeDraft) => (submitted ? errors[f] : undefined);
  const set = (f: keyof IncomeDraft) => (v: string) => setDraft((d) => ({ ...d, [f]: v }));
  const recurring = draft.frequency !== "once";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) return focusFirstError();
    onSubmit(draft);
  };

  return (
    <FormShell
      title={initial ? `Edit ${initial.name}` : "Add income"}
      backHref="#/income"
      backLabel="Income"
      onSubmit={submit}
      submitLabel={initial ? "Save changes" : "Add income"}
      showErrorSummary={submitted && !valid}
    >
      <div className={planner.fieldGrid}>
        <Field id="inc-name" label="Income name" value={draft.name} onChange={set("name")} error={show("name")} placeholder="e.g. Salary" maxLength={60} />
        <Select
          id="inc-category"
          label="Category"
          value={draft.category}
          onChange={set("category")}
          options={INCOME_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
          error={show("category")}
        />
        <Field
          id="inc-amount"
          label="Amount received (net)"
          inputMode="decimal"
          prefix="£"
          value={draft.amount}
          onChange={set("amount")}
          error={show("amount")}
          hint="What reached your account after tax and deductions. This is what's counted."
          placeholder="e.g. 2800"
        />
        <Field
          id="inc-gross"
          label={<>Gross amount <span className={vault.optional}>(optional)</span></>}
          inputMode="decimal"
          prefix="£"
          value={draft.gross}
          onChange={set("gross")}
          error={show("gross")}
          hint="Before deductions. For reference only, never added to totals."
        />
        <Select
          id="inc-frequency"
          label="How often"
          value={draft.frequency}
          onChange={(v) => set("frequency")(v as Frequency)}
          options={frequencyOptions}
          error={show("frequency")}
          hint={recurring ? "Add it once; it repeats automatically in each month." : undefined}
        />
        <Field id="inc-date" type="date" label={recurring ? "First payment date" : "Date received"} value={draft.date} onChange={set("date")} error={show("date")} />
        {recurring && (
          <Field
            id="inc-end"
            type="date"
            label={<>Last payment date <span className={vault.optional}>(optional)</span></>}
            value={draft.endDate}
            onChange={set("endDate")}
            error={show("endDate")}
            hint="Leave blank if it carries on."
          />
        )}
      </div>
      <Field id="inc-notes" label={<>Notes <span className={vault.optional}>(optional)</span></>} value={draft.notes} onChange={set("notes")} error={show("notes")} maxLength={200} />
      {initial && recurring && (
        <p className={styles.helpNote}>Changes apply to every month this income repeats in, including past ones.</p>
      )}
    </FormShell>
  );
}

/* ---------- Expenses ---------- */

const NEW_CATEGORY = "__new__";

interface ExpenseFormProps {
  initial?: ExpenseDraft;
  today: string;
  custom: CustomCategory[];
  onAddCategory: (name: string) => string;
  onSubmit: (d: ExpenseDraft) => void;
  /** "bill" opens from Bills & subscriptions: monthly, with a bill type, and returns there. */
  mode?: "expense" | "bill";
}

const billTypeOptions = [
  { id: "", label: "No, it's an everyday expense" },
  ...BILL_TYPES.map((b) => ({ id: b.id as string, label: `${b.group === "subscription" ? "Subscription" : "Bill"}: ${b.label}` })),
];

export function ExpenseForm({ initial, today, custom, onAddCategory, onSubmit, mode = "expense" }: ExpenseFormProps) {
  const billMode = mode === "bill";
  const [draft, setDraft] = useState<ExpenseDraft>(
    initial ?? {
      kind: "expense",
      description: "",
      amount: "",
      date: today,
      category: billMode ? "housing" : "groceries",
      paymentMethod: billMode ? "direct-debit" : "",
      frequency: billMode ? "monthly" : "once",
      endDate: "",
      notes: "",
      billType: billMode ? "rent-mortgage" : "",
    },
  );
  const [submitted, setSubmitted] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState<string>();
  const addingCategory = draft.category === NEW_CATEGORY;

  const errors = validateExpense(draft, custom);
  const valid = Object.keys(errors).length === 0 && !addingCategory;
  const show = (f: keyof ExpenseDraft) => (submitted ? errors[f] : undefined);
  const set = (f: keyof ExpenseDraft) => (v: string) => setDraft((d) => ({ ...d, [f]: v }));
  const recurring = draft.frequency !== "once";
  const isTransfer = draft.kind === "transfer";

  const createCategory = () => {
    const error = validateCategoryName(newCategory, custom);
    setCategoryError(error);
    if (error) return;
    const id = onAddCategory(newCategory);
    setDraft((d) => ({ ...d, category: id }));
    setNewCategory("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (addingCategory) {
      setCategoryError("Add the new category, or choose an existing one.");
      return focusFirstError();
    }
    if (!valid) return focusFirstError();
    onSubmit(draft);
  };

  const categoryOptions = [
    ...EXPENSE_CATEGORIES.map((c) => ({ id: c.id as string, label: c.label })),
    ...custom.map((c) => ({ id: c.id, label: `${c.name} (custom)` })),
    { id: NEW_CATEGORY, label: "+ Add a new category…" },
  ];

  const chooseBillType = (billType: string) =>
    setDraft((d) => {
      const suggested = billTypeOf(billType)?.category;
      // Suggest a matching category for new records; never overwrite one on an existing record.
      return { ...d, billType, category: !initial && suggested ? suggested : d.category };
    });

  return (
    <FormShell
      title={initial ? `Edit ${initial.description}` : billMode ? "Add a bill or subscription" : "Add an expense"}
      backHref={billMode ? "#/bills" : "#/expenses"}
      backLabel={billMode ? "Bills & subscriptions" : "Expenses"}
      onSubmit={submit}
      submitLabel={
        initial
          ? "Save changes"
          : billMode
            ? "Add payment"
            : isTransfer
              ? "Add transfer"
              : draft.kind === "refund"
                ? "Add refund"
                : "Add expense"
      }
      showErrorSummary={submitted && !valid}
    >
      {billMode ? (
        <p className={planner.hint}>
          A regular payment such as rent, energy, insurance, your phone or a streaming service. Add it once and it&rsquo;s
          counted as spending in every month it&rsquo;s due.
        </p>
      ) : (
      <>
      <fieldset className={vault.segmented}>
        <legend className="visually-hidden">Type</legend>
        {EXPENSE_KINDS.map((k) => (
          <label key={k.id} className={`${vault.segment} ${draft.kind === k.id ? vault.segmentActive : ""}`}>
            <input
              type="radio"
              name="expense-kind"
              value={k.id}
              checked={draft.kind === k.id}
              onChange={() => setDraft((d) => ({ ...d, kind: k.id as ExpenseKind }))}
              className="visually-hidden"
            />
            {k.id === "transfer" ? "Transfer" : k.label}
          </label>
        ))}
      </fieldset>
      <p className={planner.hint}>
        {isTransfer
          ? "Money moved between your own accounts, such as paying off a credit card or moving money to savings. Shown for reference, never counted as spending."
          : draft.kind === "refund"
            ? "Money you got back. It reduces spending in the category you choose."
            : "Money you spent."}
      </p>
      </>
      )}

      <div className={planner.fieldGrid}>
        <Field
          id="exp-description"
          label="Description"
          value={draft.description}
          onChange={set("description")}
          error={show("description")}
          placeholder={isTransfer ? "e.g. Credit card bill" : "e.g. Weekly shop"}
          maxLength={60}
        />
        <Field id="exp-amount" label="Amount" inputMode="decimal" prefix="£" value={draft.amount} onChange={set("amount")} error={show("amount")} placeholder="e.g. 42.50" />
        {!isTransfer && (
          <Select
            id="exp-category"
            label="Category"
            value={draft.category}
            onChange={(v) => {
              setCategoryError(undefined);
              set("category")(v);
            }}
            options={categoryOptions}
            error={show("category")}
          />
        )}
        <Select
          id="exp-method"
          label={<>Payment method <span className={vault.optional}>(optional)</span></>}
          value={draft.paymentMethod}
          onChange={set("paymentMethod")}
          options={PAYMENT_METHODS.map((p) => ({ id: p.id, label: p.label }))}
          error={show("paymentMethod")}
          hint={
            draft.paymentMethod === "credit-card" && !isTransfer
              ? "Card purchases count when you make them. Record the card bill later as a transfer."
              : undefined
          }
        />
        {addingCategory && !isTransfer && (
          <div className={`${planner.field} ${styles.newCategory}`}>
            <Field id="exp-new-category" label="New category name" value={newCategory} onChange={setNewCategory} error={categoryError} maxLength={30} placeholder="e.g. Pets" />
            <button type="button" className={vault.buttonSecondary} onClick={createCategory}>
              Add category
            </button>
          </div>
        )}
        <Select
          id="exp-frequency"
          label="How often"
          value={draft.frequency}
          onChange={(v) =>
            // A one-off can't be a bill (outside the bills form, where the error explains why).
            setDraft((d) => ({ ...d, frequency: v as Frequency, billType: v === "once" && !billMode ? "" : d.billType }))
          }
          options={frequencyOptions}
          error={show("frequency")}
          hint={recurring ? "Add it once; it repeats automatically in each month." : undefined}
        />
        <Field
          id="exp-date"
          type="date"
          label={recurring ? "First payment date" : "Date"}
          value={draft.date}
          onChange={set("date")}
          error={show("date")}
          hint={!recurring && draft.date > today ? "A future date counts as expected until it arrives." : undefined}
        />
        {draft.kind === "expense" && (recurring || billMode) && (
          <Select
            id="exp-bill-type"
            label={billMode ? "Type of payment" : "Is this a bill or subscription?"}
            value={draft.billType}
            onChange={chooseBillType}
            options={billMode ? billTypeOptions.slice(1) : billTypeOptions}
            error={show("billType")}
            hint={billMode ? undefined : "Bills and subscriptions also appear under Bills & subscriptions, counted once."}
          />
        )}
        {recurring && (
          <Field
            id="exp-end"
            type="date"
            label={<>Last payment date <span className={vault.optional}>(optional)</span></>}
            value={draft.endDate}
            onChange={set("endDate")}
            error={show("endDate")}
            hint="Leave blank if it carries on."
          />
        )}
      </div>
      <Field id="exp-notes" label={<>Notes <span className={vault.optional}>(optional)</span></>} value={draft.notes} onChange={set("notes")} error={show("notes")} maxLength={200} />
      {initial && recurring && (
        <p className={styles.helpNote}>Changes apply to every month this repeats in, including past ones.</p>
      )}
    </FormShell>
  );
}
