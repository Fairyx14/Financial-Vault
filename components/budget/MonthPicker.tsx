import Icon from "@/components/Icon";
import { shiftMonth } from "@/lib/budget";
import styles from "./budget.module.css";

export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));

/** Previous / next buttons plus a native month field for jumping further. */
export default function MonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <div className={styles.monthPicker} role="group" aria-label="Month">
      <button type="button" className={styles.monthStep} onClick={() => onChange(shiftMonth(month, -1))} aria-label={`Previous month, ${monthLabel(shiftMonth(month, -1))}`}>
        <Icon paths={["m15 18-6-6 6-6"]} size={18} />
      </button>
      <label className={styles.monthField}>
        <span className="visually-hidden">Choose month</span>
        <input
          type="month"
          value={month}
          onChange={(event) => event.target.value && onChange(event.target.value)}
        />
      </label>
      <button type="button" className={styles.monthStep} onClick={() => onChange(shiftMonth(month, 1))} aria-label={`Next month, ${monthLabel(shiftMonth(month, 1))}`}>
        <Icon paths={["m9 18 6-6-6-6"]} size={18} />
      </button>
    </div>
  );
}
