import { formatMoney, type CurrencyCode } from "@/lib/plan";
import type { Pace } from "@/lib/vault";
import Icon from "./Icon";
import styles from "./Vault.module.css";

const ICONS = {
  reached: ["M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"],
  ahead: ["M7 17 17 7", "M8 7h9v9"],
  "on-track": ["m5 12.5 4.5 4.5L19 7.5"],
  behind: ["M12 8v5", "M12 16.5h.01", "M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"],
};

/** Status with an icon and words, so it never relies on colour alone. */
export default function PaceBadge({ pace, currency }: { pace: Pace; currency: CurrencyCode }) {
  const amount = formatMoney(Math.abs(pace.difference), currency);
  const label = {
    reached: "Goal reached",
    ahead: `Ahead by ${amount}`,
    "on-track": "On track",
    behind: `Behind by ${amount}`,
  }[pace.status];

  return (
    <span className={`${styles.badge} ${pace.status === "behind" ? styles.badgeWarning : styles.badgeGood}`}>
      <Icon paths={ICONS[pace.status]} size={14} />
      {label}
    </span>
  );
}
