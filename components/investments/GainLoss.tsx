import type { Decimal } from "@/lib/decimal";
import Icon from "@/components/Icon";
import { direction, signedMoney, signedPercent } from "./format";
import styles from "./investments.module.css";

interface GainLossProps {
  amount: Decimal;
  percent?: Decimal | null;
  /** "stack" puts the percentage on its own line. */
  layout?: "inline" | "stack";
  size?: "sm" | "lg";
}

const ARROWS = {
  positive: ["M12 19V5", "m5 12 7-7 7 7"],
  negative: ["M12 5v14", "m19 12-7 7-7-7"],
  neutral: ["M5 12h14"],
};

/** Gain or loss with an arrow, a sign and words, so it never relies on colour alone. */
export default function GainLoss({ amount, percent, layout = "inline", size = "sm" }: GainLossProps) {
  const dir = direction(amount);
  const word = dir === "positive" ? "gain" : "loss";
  return (
    <span className={`${styles.gain} ${styles[dir]} ${layout === "stack" ? styles.gainStack : ""} ${size === "lg" ? styles.gainLg : ""}`}>
      <span className={styles.gainMain}>
        <Icon paths={ARROWS[dir]} size={size === "lg" ? 18 : 14} />
        {dir !== "neutral" && <span className="visually-hidden">{word} of </span>}
        {signedMoney(amount)}
      </span>
      {percent !== undefined && (
        <span className={styles.gainPct}>{percent === null ? "–" : signedPercent(percent)}</span>
      )}
    </span>
  );
}
