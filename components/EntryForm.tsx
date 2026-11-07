"use client";

import { useState, type FormEvent } from "react";
import { CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/plan";
import { todayISO, type Entry } from "@/lib/vault";
import styles from "./Vault.module.css";

interface EntryFormProps {
  goalId: string;
  balance: number;
  currency: CurrencyCode;
  onAdd: (entry: Omit<Entry, "id">) => void;
}

type Kind = "deposit" | "withdrawal";

export default function EntryForm({ goalId, balance, currency, onAdd }: EntryFormProps) {
  const [kind, setKind] = useState<Kind>("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const today = todayISO();
  const id = (name: string) => `${goalId}-${name}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Enter an amount above zero.");
      return;
    }
    if (kind === "withdrawal" && value > balance) {
      setError(`You can withdraw up to ${formatMoney(balance, currency)}.`);
      return;
    }
    if (!date || date > today) {
      setError("Choose today or an earlier date.");
      return;
    }
    onAdd({ date, amount: kind === "deposit" ? value : -value, note: note.trim() });
    setAmount("");
    setNote("");
    setError("");
  };

  return (
    <form className={styles.entryForm} onSubmit={submit} noValidate>
      <fieldset className={styles.segmented}>
        <legend className="visually-hidden">Type of entry</legend>
        {(["deposit", "withdrawal"] as Kind[]).map((option) => (
          <label key={option} className={`${styles.segment} ${kind === option ? styles.segmentActive : ""}`}>
            <input
              type="radio"
              name={id("kind")}
              value={option}
              checked={kind === option}
              onChange={() => setKind(option)}
              className="visually-hidden"
            />
            {option === "deposit" ? "Deposit" : "Withdrawal"}
          </label>
        ))}
      </fieldset>

      <div className={styles.entryFields}>
        <div className={styles.entryField}>
          <label htmlFor={id("amount")}>Amount</label>
          <div className={styles.entryInput}>
            <span aria-hidden="true">{CURRENCIES[currency].symbol}</span>
            <input
              id={id("amount")}
              type="number"
              inputMode="decimal"
              min={0}
              step={10}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? id("error") : undefined}
            />
          </div>
        </div>
        <div className={styles.entryField}>
          <label htmlFor={id("date")}>Date</label>
          <div className={styles.entryInput}>
            <input id={id("date")} type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </div>
        <div className={`${styles.entryField} ${styles.entryFieldWide}`}>
          <label htmlFor={id("note")}>
            Note <span className={styles.optional}>(optional)</span>
          </label>
          <div className={styles.entryInput}>
            <input
              id={id("note")}
              type="text"
              maxLength={60}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Birthday money"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {error && (
        <p id={id("error")} className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.buttonPrimary}>
        {kind === "deposit" ? "Add deposit" : "Record withdrawal"}
      </button>
    </form>
  );
}
