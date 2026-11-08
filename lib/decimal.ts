/**
 * Exact decimal arithmetic for money, prices and unit quantities.
 *
 * JavaScript numbers are binary floating point, so 0.1 + 0.2 = 0.30000000000000004.
 * That drift adds up in a portfolio. A Decimal stores its value as a whole number
 * (BigInt) of 10^-12 units, so adding, subtracting and comparing are exact.
 * Multiplying and dividing round to 12 decimal places (half away from zero),
 * far below the penny. Values are rounded to pennies only when displayed.
 */

const DP = 12;
const SCALE = 10n ** BigInt(DP);

/** Integer division rounded half away from zero. */
function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError("Division by zero");
  const negative = n < 0n !== d < 0n;
  const absN = n < 0n ? -n : n;
  const absD = d < 0n ? -d : d;
  const quotient = absN / absD;
  const rounded = (absN % absD) * 2n >= absD ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export class Decimal {
  /** The value multiplied by 10^12. */
  readonly raw: bigint;

  private constructor(raw: bigint) {
    this.raw = raw;
  }

  static readonly ZERO = new Decimal(0n);
  static readonly ONE = new Decimal(SCALE);
  static readonly HUNDRED = new Decimal(100n * SCALE);

  /**
   * Strictly parses text such as "1,250.50", "£12" or "0.00012".
   * Returns null for anything that isn't a plain decimal number (including "1e5").
   */
  static parse(text: string): Decimal | null {
    const cleaned = String(text).replace(/[,\s£$€]/g, "");
    const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(cleaned);
    if (!match) return null;
    const [, sign, whole = "", fraction = ""] = match;
    if (!whole && !fraction) return null;
    if (fraction.length > DP) return null;
    const raw = BigInt((whole || "0") + fraction.padEnd(DP, "0"));
    return new Decimal(sign && raw !== 0n ? -raw : raw);
  }

  /** Like parse, but throws. Use only for values that were validated when saved. */
  static of(value: string | number): Decimal {
    const parsed = Decimal.parse(String(value));
    if (!parsed) throw new TypeError(`Not a decimal number: ${value}`);
    return parsed;
  }

  static sum(values: Decimal[]): Decimal {
    return values.reduce((total, value) => total.plus(value), Decimal.ZERO);
  }

  plus(other: Decimal): Decimal {
    return new Decimal(this.raw + other.raw);
  }

  minus(other: Decimal): Decimal {
    return new Decimal(this.raw - other.raw);
  }

  times(other: Decimal): Decimal {
    return new Decimal(divRound(this.raw * other.raw, SCALE));
  }

  dividedBy(other: Decimal): Decimal {
    return new Decimal(divRound(this.raw * SCALE, other.raw));
  }

  negated(): Decimal {
    return new Decimal(-this.raw);
  }

  abs(): Decimal {
    return this.raw < 0n ? this.negated() : this;
  }

  compare(other: Decimal): -1 | 0 | 1 {
    return this.raw < other.raw ? -1 : this.raw > other.raw ? 1 : 0;
  }

  isZero(): boolean {
    return this.raw === 0n;
  }

  isNegative(): boolean {
    return this.raw < 0n;
  }

  isPositive(): boolean {
    return this.raw > 0n;
  }

  /** Rounded to `dp` decimal places (half away from zero), e.g. toFixed(2) → "1800.00". */
  toFixed(dp: number): string {
    const rounded = divRound(this.raw, 10n ** BigInt(DP - dp));
    const digits = (rounded < 0n ? -rounded : rounded).toString().padStart(dp + 1, "0");
    const whole = digits.slice(0, digits.length - dp);
    const fraction = dp > 0 ? `.${digits.slice(digits.length - dp)}` : "";
    return `${rounded < 0n ? "-" : ""}${whole}${fraction}`;
  }

  /** Shortest exact form, e.g. "2.5" or "0.00012". */
  toString(): string {
    const fixed = this.toFixed(DP);
    return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
  }

  /** For charts and Intl formatting only, never for further maths. */
  toNumber(): number {
    return Number(this.toString());
  }
}
