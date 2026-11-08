"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  buildTransaction,
  emptyTransactionDraft,
  summarizeHolding,
  transactionToDraft,
  TRANSACTION_LABELS,
  unitsOwnedOn,
  upsertTransaction,
  validateTransaction,
  type Investment,
  type InvestmentTransaction,
  type TransactionDraft,
  type TransactionType,
} from "@/lib/investments";
import { formatDay, todayISO } from "@/lib/vault";
import { currencySymbol, money, signedMoney, unitPrice, units } from "./format";
import Field from "./Field";
import GainLoss from "./GainLoss";
import planner from "../DreamVault.module.css";
import vault from "../Vault.module.css";
import styles from "./investments.module.css";

/** Types offered when recording something new. Price updates have their own quick form. */
const ADDABLE: TransactionType[] = ["buy", "sell", "dividend", "fee"];

const HEADINGS: Record<TransactionType, string> = {
  buy: "Record a purchase",
  sell: "Record a sale",
  dividend: "Record a dividend",
  fee: "Record a fee",
  price: "Record a price",
};

interface TransactionFormProps {
  investment: Investment;
  /** The entry being edited, if any. */
  editing?: InvestmentTransaction;
  initialType: TransactionType;
  cancelHref: string;
  onSubmit: (draft: TransactionDraft) => void;
}

export default function TransactionForm({ investment, editing, initialType, cancelHref, onSubmit }: TransactionFormProps) {
  const today = todayISO();
  const before = useMemo(() => summarizeHolding(investment), [investment]);
  const foreign = investment.currency !== "GBP";
  const symbol = currencySymbol(investment.currency);

  const [draft, setDraft] = useState<TransactionDraft>(() =>
    editing
      ? transactionToDraft(editing)
      : { ...emptyTransactionDraft(initialType, today), fxRate: foreign ? before.currentFx.toString() : "" },
  );
  const [touched, setTouched] = useState<Partial<Record<keyof TransactionDraft, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = validateTransaction(investment, draft, today, editing?.id);
  const valid = Object.keys(errors).length === 0;
  const show = (field: keyof TransactionDraft) => (submitted || touched[field] ? errors[field] : undefined);
  const set = (field: keyof TransactionDraft) => (value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const blur = (field: keyof TransactionDraft) => () => setTouched((current) => ({ ...current, [field]: true }));

  const ownedOnDate = draft.date ? unitsOwnedOn(investment, draft.date, editing?.id) : null;

  // Preview the effect, worked out by the same code that will save it.
  const preview = useMemo(() => {
    if (!valid) return null;
    const id = editing?.id ?? "__preview__";
    const after = summarizeHolding(upsertTransaction(investment, buildTransaction(draft, investment.currency, id)));
    const entry = after.entries.find((e) => e.transaction.id === id);
    return { after, entry };
  }, [valid, draft, investment, editing]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSubmit(draft);
  };

  const type = draft.type;
  const what = TRANSACTION_LABELS[type].toLowerCase();

  return (
    <section aria-labelledby="view-title">
      <a href={cancelHref} className={vault.backLink}>
        ← Back to {investment.name}
      </a>
      <h2 id="view-title" tabIndex={-1} data-view-heading className={`${vault.viewTitle} ${vault.formTitle}`}>
        {editing ? `Edit ${what}` : HEADINGS[type]}
      </h2>

      <div className={planner.layout}>
        <form className={planner.planner} onSubmit={submit} noValidate aria-labelledby="view-title">
          {!editing && (
            <fieldset className={vault.segmented}>
              <legend className="visually-hidden">What are you recording?</legend>
              {ADDABLE.map((option) => (
                <label key={option} className={`${vault.segment} ${type === option ? vault.segmentActive : ""}`}>
                  <input
                    type="radio"
                    name="tx-type"
                    value={option}
                    checked={type === option}
                    onChange={() => {
                      setDraft((current) => ({ ...current, type: option }));
                      setSubmitted(false);
                      setTouched({});
                    }}
                    className="visually-hidden"
                  />
                  {TRANSACTION_LABELS[option]}
                </label>
              ))}
            </fieldset>
          )}

          <div className={planner.fieldGrid}>
            <Field
              id="tx-date"
              type="date"
              label="Date"
              value={draft.date}
              onChange={set("date")}
              onBlur={blur("date")}
              error={show("date")}
              max={today}
            />

            {(type === "buy" || type === "sell") && (
              <>
                <Field
                  id="tx-quantity"
                  label="Units"
                  inputMode="decimal"
                  value={draft.quantity}
                  onChange={set("quantity")}
                  onBlur={blur("quantity")}
                  // Sale errors about units owned are shown straight away: they're the key constraint.
                  error={type === "sell" && errors.quantity?.startsWith("On ") ? errors.quantity : show("quantity")}
                  hint={
                    type === "sell" && ownedOnDate
                      ? `You owned ${units(ownedOnDate)} units on ${draft.date ? formatDay(draft.date) : "that date"}.`
                      : undefined
                  }
                  placeholder="e.g. 10"
                />
                <Field
                  id="tx-price"
                  label={type === "sell" ? "Sale price per unit" : "Price per unit"}
                  inputMode="decimal"
                  prefix={symbol}
                  value={draft.price}
                  onChange={set("price")}
                  onBlur={blur("price")}
                  error={show("price")}
                  placeholder={unitPrice(before.currentPrice, investment.currency).replace(/[^\d.,]/g, "")}
                />
                <Field
                  id="tx-fees"
                  label={<>Fees <span className={vault.optional}>(optional)</span></>}
                  inputMode="decimal"
                  prefix={symbol}
                  value={draft.fees}
                  onChange={set("fees")}
                  onBlur={blur("fees")}
                  error={show("fees")}
                  hint={type === "sell" ? "Taken off the sale proceeds." : "Added to what you paid."}
                  placeholder="0.00"
                />
              </>
            )}

            {(type === "dividend" || type === "fee") && (
              <Field
                id="tx-amount"
                label={type === "dividend" ? "Amount received" : "Fee charged"}
                inputMode="decimal"
                prefix={symbol}
                value={draft.amount}
                onChange={set("amount")}
                onBlur={blur("amount")}
                error={show("amount")}
                hint={type === "dividend" ? "The total paid to you, not per share." : "For charges not tied to a purchase or sale, e.g. a platform fee."}
                placeholder={type === "dividend" ? "e.g. 42.50" : "e.g. 3.00"}
              />
            )}

            {type === "price" && (
              <Field
                id="tx-price"
                label="Price per unit"
                inputMode="decimal"
                prefix={symbol}
                value={draft.price}
                onChange={set("price")}
                onBlur={blur("price")}
                error={show("price")}
              />
            )}

            {foreign && (
              <Field
                id="tx-fx"
                label="Exchange rate"
                inputMode="decimal"
                prefix="£"
                suffix={`per ${symbol}1`}
                value={draft.fxRate}
                onChange={set("fxRate")}
                onBlur={blur("fxRate")}
                error={show("fxRate")}
                hint="The rate on this date, used to convert this entry to pounds."
              />
            )}
          </div>

          <Field
            id="tx-note"
            label={<>Note <span className={vault.optional}>(optional)</span></>}
            value={draft.note}
            onChange={set("note")}
            onBlur={blur("note")}
            error={show("note")}
            maxLength={80}
            placeholder={type === "fee" ? "e.g. Platform fee" : "e.g. Monthly top-up"}
          />

          {(errors.history || errors.type) && (
            <p className={vault.formError} role="alert">
              {errors.history ?? errors.type}
            </p>
          )}

          <div className={vault.formActions}>
            <button type="submit" className={vault.buttonPrimary}>
              {editing ? "Save changes" : `Save ${what}`}
            </button>
            <a href={cancelHref} className={vault.buttonGhost}>
              Cancel
            </a>
            {submitted && !valid && !errors.history && (
              <p className={vault.formError} role="alert">
                Please fix the highlighted fields.
              </p>
            )}
          </div>
        </form>

        <aside className={styles.previewCard} aria-labelledby="tx-preview-title">
          <p className={styles.previewEyebrow}>What this changes</p>
          <h3 id="tx-preview-title" className={styles.previewTitle}>
            {investment.name}
          </h3>
          {preview ? (
            <>
              <dl className={styles.previewList}>
                <div>
                  <dt>Units owned now</dt>
                  <dd>
                    {units(before.quantity)} → {units(preview.after.quantity)}
                  </dd>
                </div>
                {type === "sell" && preview.entry?.realisedGBP && (
                  <>
                    <div>
                      <dt>Cost of units sold</dt>
                      <dd>{money(preview.entry.costRemovedGBP!)}</dd>
                    </div>
                    <div>
                      <dt>Realised on this sale</dt>
                      <dd>
                        <GainLoss amount={preview.entry.realisedGBP} />
                      </dd>
                    </div>
                  </>
                )}
                {type === "buy" && preview.after.averageCost && (
                  <div>
                    <dt>Average cost per unit</dt>
                    <dd>{unitPrice(preview.after.averageCost, investment.currency)}</dd>
                  </div>
                )}
                {type === "dividend" && (
                  <div>
                    <dt>Dividends to date</dt>
                    <dd>{money(preview.after.dividendsGBP)}</dd>
                  </div>
                )}
                <div>
                  <dt>Total return</dt>
                  <dd>{signedMoney(preview.after.totalReturnGBP)}</dd>
                </div>
              </dl>
              {type === "sell" && (
                <p className={styles.previewNote}>
                  Only the difference between what you get and what those units cost you counts as a gain. The rest is
                  your own money coming back.
                </p>
              )}
            </>
          ) : (
            <p className={styles.previewEmpty}>Fill in the details to see the effect.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
