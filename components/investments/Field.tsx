import type { ReactNode } from "react";
import planner from "../DreamVault.module.css";

interface FieldProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  type?: "text" | "date";
  /** "decimal" shows a number keypad on phones while keeping exact text. */
  inputMode?: "decimal" | "text";
  placeholder?: string;
  max?: string;
  maxLength?: number;
  autoCapitalize?: string;
}

/**
 * Text field styled like the Savings Vault inputs. Numbers use type="text" with a
 * decimal keypad so the exact digits typed (e.g. "0.00012345") are kept.
 */
export default function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  prefix,
  suffix,
  type = "text",
  inputMode = "text",
  placeholder,
  max,
  maxLength,
  autoCapitalize,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={planner.field}>
      <label htmlFor={id} className={planner.label}>
        {label}
      </label>
      <div className={`${planner.inputWrap} ${error ? planner.inputWrapError : ""}`}>
        {prefix && (
          <span className={planner.affix} aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          inputMode={type === "text" ? inputMode : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          max={max}
          maxLength={maxLength}
          autoComplete="off"
          autoCapitalize={autoCapitalize}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={planner.input}
        />
        {suffix && (
          <span className={planner.affix} aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className={planner.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={planner.error}>
          {error}
        </p>
      )}
    </div>
  );
}
