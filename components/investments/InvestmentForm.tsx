"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  CATEGORIES,
  createInvestment,
  EMPTY_DRAFT,
  INVESTMENT_CURRENCIES,
  summarizeHolding,
  validateDraft,
  type InvestmentCurrency,
  type InvestmentDraft,
} from "@/lib/investments";
import { todayISO } from "@/lib/vault";
import { currencySymbol, money, unitPrice } from "./format";
import Field from "./Field";
import GainLoss from "./GainLoss";
import planner from "../DreamVault.module.css";
import vault from "../Vault.module.css";
import styles from "./investments.module.css";

interface InvestmentFormProps {
  mode: "create" | "edit";
  initial?: InvestmentDraft;
  cancelHref: string;
  onSubmit: (draft: InvestmentDraft) => void;
}

export default function InvestmentForm({ mode, initial, cancelHref, onSubmit }: InvestmentFormProps) {
  const today = todayISO();
  const [draft, setDraft] = useState<InvestmentDraft>(initial ?? { ...EMPTY_DRAFT, purchaseDate: today });
  const [touched, setTouched] = useState<Partial<Record<keyof InvestmentDraft, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const isEdit = mode === "edit";
  // When editing, only the details can change; transactions are edited one by one from the history.
  const errors = validateDraft(draft, today, isEdit ? "details" : "create");
  const valid = Object.keys(errors).length === 0;
  const show = (field: keyof InvestmentDraft) => (submitted || touched[field] ? errors[field] : undefined);
  const set = (field: keyof InvestmentDraft) => (value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const blur = (field: keyof InvestmentDraft) => () => setTouched((current) => ({ ...current, [field]: true }));

  const foreign = draft.currency !== "GBP";
  const symbol = currencySymbol(draft.currency);

  // Live preview, worked out with the same code that saves the investment.
  const preview = useMemo(
    () => (valid && !isEdit ? summarizeHolding(createInvestment(draft, today, () => "preview")) : null),
    [valid, isEdit, draft, today],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSubmit(draft);
  };

  return (
    <section aria-labelledby="view-title">
      <a href={cancelHref} className={vault.backLink}>
        ← {mode === "edit" ? "Back to investment" : "All investments"}
      </a>
      <h2 id="view-title" tabIndex={-1} data-view-heading className={`${vault.viewTitle} ${vault.formTitle}`}>
        {isEdit ? `Edit ${initial?.name ?? "investment"} details` : "Add an investment"}
      </h2>

      <div className={planner.layout}>
        <form className={planner.planner} onSubmit={submit} noValidate aria-labelledby="view-title">
          <fieldset className={planner.fieldset}>
            <legend className={planner.stepLegend}>
              <span className={planner.stepNumber} aria-hidden="true">01</span>
              About the investment
            </legend>
            <Field id="inv-name" label="Investment name" value={draft.name} onChange={set("name")} onBlur={blur("name")} error={show("name")} placeholder="e.g. Vanguard FTSE Global All Cap" maxLength={60} />
            <div className={planner.fieldGrid}>
              <Field
                id="inv-ticker"
                label={<>Ticker symbol <span className={vault.optional}>(optional)</span></>}
                value={draft.ticker}
                onChange={set("ticker")}
                onBlur={blur("ticker")}
                error={show("ticker")}
                placeholder="e.g. VWRL"
                maxLength={12}
                autoCapitalize="characters"
              />
              <div className={planner.field}>
                <label htmlFor="inv-category" className={planner.label}>
                  Category
                </label>
                <div className={`${planner.inputWrap} ${planner.selectWrap} ${show("category") ? planner.inputWrapError : ""}`}>
                  <select
                    id="inv-category"
                    value={draft.category}
                    onChange={(event) => set("category")(event.target.value)}
                    onBlur={blur("category")}
                    aria-invalid={show("category") ? true : undefined}
                    aria-describedby={show("category") ? "inv-category-error" : undefined}
                    className={planner.input}
                  >
                    <option value="">Choose a category</option>
                    {CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                {show("category") && (
                  <p id="inv-category-error" className={planner.error}>
                    {show("category")}
                  </p>
                )}
              </div>
            </div>
            <Field
              id="inv-account"
              label={<>Account or portfolio <span className={vault.optional}>(optional)</span></>}
              value={draft.account}
              onChange={set("account")}
              onBlur={blur("account")}
              error={show("account")}
              placeholder="e.g. Stocks & Shares ISA"
              maxLength={40}
            />
          </fieldset>

          {isEdit && (
            <p className={styles.fxNote}>
              <strong>Currency:</strong> {INVESTMENT_CURRENCIES[draft.currency].label}. It&rsquo;s fixed once an
              investment has transactions. To change purchases, sales, dividends or prices, use the edit buttons in the
              investment&rsquo;s history.
            </p>
          )}

          {!isEdit && (
          <>
          <fieldset className={planner.fieldset}>
            <legend className={planner.stepLegend}>
              <span className={planner.stepNumber} aria-hidden="true">02</span>
              Your purchase
            </legend>
            <div className={planner.fieldGrid}>
              <div className={planner.field}>
                <label htmlFor="inv-currency" className={planner.label}>
                  Currency
                </label>
                <div className={`${planner.inputWrap} ${planner.selectWrap}`}>
                  <select
                    id="inv-currency"
                    value={draft.currency}
                    onChange={(event) => set("currency")(event.target.value as InvestmentCurrency)}
                    className={planner.input}
                    aria-describedby="inv-currency-hint"
                  >
                    {(Object.keys(INVESTMENT_CURRENCIES) as InvestmentCurrency[]).map((code) => (
                      <option key={code} value={code}>
                        {INVESTMENT_CURRENCIES[code].label}
                      </option>
                    ))}
                  </select>
                </div>
                <p id="inv-currency-hint" className={planner.hint}>
                  The currency the price is quoted in.
                </p>
              </div>
              <Field id="inv-date" type="date" label="Purchase date" value={draft.purchaseDate} onChange={set("purchaseDate")} onBlur={blur("purchaseDate")} error={show("purchaseDate")} max={today} />
              <Field id="inv-quantity" label="Units or shares" inputMode="decimal" value={draft.quantity} onChange={set("quantity")} onBlur={blur("quantity")} error={show("quantity")} placeholder="e.g. 25" />
              <Field id="inv-price" label="Price per unit" inputMode="decimal" prefix={symbol} value={draft.purchasePrice} onChange={set("purchasePrice")} onBlur={blur("purchasePrice")} error={show("purchasePrice")} placeholder="e.g. 105.40" />
              <Field
                id="inv-fees"
                label={<>Transaction fees <span className={vault.optional}>(optional)</span></>}
                inputMode="decimal"
                prefix={symbol}
                value={draft.fees}
                onChange={set("fees")}
                onBlur={blur("fees")}
                error={show("fees")}
                hint="The total fee for this purchase."
                placeholder="0.00"
              />
              {foreign && (
                <Field
                  id="inv-purchase-fx"
                  label="Exchange rate at purchase"
                  inputMode="decimal"
                  prefix="£"
                  suffix={`per ${symbol}1`}
                  value={draft.purchaseFx}
                  onChange={set("purchaseFx")}
                  onBlur={blur("purchaseFx")}
                  error={show("purchaseFx")}
                  hint={`How many pounds ${symbol}1 was worth on the purchase date, e.g. from your broker statement.`}
                  placeholder="e.g. 0.79"
                />
              )}
            </div>
          </fieldset>

          <fieldset className={planner.fieldset}>
            <legend className={planner.stepLegend}>
              <span className={planner.stepNumber} aria-hidden="true">03</span>
              Current price
            </legend>
            <div className={planner.fieldGrid}>
              <Field
                id="inv-current"
                label="Current price per unit"
                inputMode="decimal"
                prefix={symbol}
                value={draft.currentPrice}
                onChange={set("currentPrice")}
                onBlur={blur("currentPrice")}
                error={show("currentPrice")}
                hint="Look this up yourself, e.g. on your broker's app. Dream Vault doesn't fetch prices."
                placeholder="e.g. 112.80"
              />
              {foreign && (
                <Field
                  id="inv-current-fx"
                  label="Today's exchange rate"
                  inputMode="decimal"
                  prefix="£"
                  suffix={`per ${symbol}1`}
                  value={draft.currentFx}
                  onChange={set("currentFx")}
                  onBlur={blur("currentFx")}
                  error={show("currentFx")}
                  hint="Used to convert the current value to pounds."
                  placeholder="e.g. 0.78"
                />
              )}
            </div>
          </fieldset>
          </>
          )}

          <div className={vault.formActions}>
            <button type="submit" className={vault.buttonPrimary}>
              {mode === "edit" ? "Save changes" : "Add investment"}
            </button>
            <a href={cancelHref} className={vault.buttonGhost}>
              Cancel
            </a>
            {submitted && !valid && (
              <p className={vault.formError} role="alert">
                Please fix the highlighted fields.
              </p>
            )}
          </div>
        </form>

        {!isEdit && (
        <aside className={styles.previewCard} aria-labelledby="preview-title">
          <p className={styles.previewEyebrow}>Preview</p>
          <h3 id="preview-title" className={styles.previewTitle}>
            {draft.name.trim() || "Your investment"}
          </h3>
          {preview ? (
            <>
            <dl className={styles.previewList}>
              <div>
                <dt>Total invested</dt>
                <dd>{money(preview.investedGBP)}</dd>
              </div>
              <div>
                <dt>Current value</dt>
                <dd>{money(preview.valueGBP)}</dd>
              </div>
              <div>
                <dt>Gain / loss</dt>
                <dd>
                  <GainLoss amount={preview.gainGBP} percent={preview.returnPct} />
                </dd>
              </div>
              {preview.averageCost && (
                <div>
                  <dt>Average cost per unit</dt>
                  <dd>{unitPrice(preview.averageCost, draft.currency)}</dd>
                </div>
              )}
            </dl>
            {foreign && (
              <p className={styles.previewNote}>
                Invested: {money(preview.investedNative, draft.currency)} × £{draft.purchaseFx} = {money(preview.investedGBP)}.
                Value: {money(preview.valueNative, draft.currency)} × £{draft.currentFx} = {money(preview.valueGBP)}.
              </p>
            )}
            </>
          ) : (
            <p className={styles.previewEmpty}>Fill in the purchase and current price to see the figures.</p>
          )}
        </aside>
        )}
      </div>
    </section>
  );
}
