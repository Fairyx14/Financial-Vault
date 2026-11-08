import type { Decimal } from "@/lib/decimal";
import { INVESTMENT_CURRENCIES, type InvestmentCurrency } from "@/lib/investments";

const LOCALES: Record<InvestmentCurrency, string> = { GBP: "en-GB", USD: "en-US", EUR: "en-IE" };

/** Money rounded to pennies (or cents), e.g. "£15,800.00". */
export function money(value: Decimal, currency: InvestmentCurrency = "GBP"): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value.toFixed(2)));
}

/** "+£1,800.00", "−£250.00" or "£0.00". */
export function signedMoney(value: Decimal, currency: InvestmentCurrency = "GBP"): string {
  const rounded = Number(value.toFixed(2));
  const text = money(value.abs(), currency);
  return rounded > 0 ? `+${text}` : rounded < 0 ? `−${text}` : text;
}

/** "+12.86%", "−20.00%" or "0.00%". */
export function signedPercent(value: Decimal): string {
  const rounded = Number(value.toFixed(2));
  const text = `${Math.abs(rounded).toFixed(2)}%`;
  return rounded > 0 ? `+${text}` : rounded < 0 ? `−${text}` : text;
}

/**
 * A price per unit. Large prices show pennies; fund prices keep up to 4 decimals;
 * prices under 1 keep up to 6 so tiny values stay readable (e.g. "$0.000123").
 */
export function unitPrice(value: Decimal, currency: InvestmentCurrency): string {
  const size = value.abs().toNumber();
  const maxDecimals = size >= 1000 ? 2 : size >= 1 ? 4 : 6;
  const rounded = trimmedFixed(value, maxDecimals);
  const decimals = Math.max((rounded.split(".")[1] ?? "").length, 2);
  return new Intl.NumberFormat(LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(rounded));
}

/** Rounds to at most `dp` places and drops trailing zeros: 140.5000 → "140.5". */
function trimmedFixed(value: Decimal, dp: number): string {
  const fixed = value.toFixed(dp);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

/** Units owned, without trailing zeros, e.g. "1,250" or "0.00012345". */
export function units(value: Decimal): string {
  const [whole, fraction] = value.toString().split(".");
  const grouped = Number(whole).toLocaleString("en-GB");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export const currencySymbol = (currency: InvestmentCurrency) => INVESTMENT_CURRENCIES[currency].symbol;

/** "positive" | "negative" | "neutral", judged on the displayed (rounded) value. */
export function direction(value: Decimal | null): "positive" | "negative" | "neutral" {
  if (!value) return "neutral";
  const rounded = Number(value.toFixed(2));
  return rounded > 0 ? "positive" : rounded < 0 ? "negative" : "neutral";
}
