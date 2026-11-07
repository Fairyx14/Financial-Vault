import { GOALS, type GoalId } from "@/lib/goals";
import Icon from "./Icon";
import styles from "./DreamVault.module.css";

interface GoalPickerProps {
  value: GoalId;
  onChange: (id: GoalId) => void;
}

/** A radio group styled as cards, so it keeps native keyboard behaviour (arrow keys, Space). */
export default function GoalPicker({ value, onChange }: GoalPickerProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.stepLegend}>
        <span className={styles.stepNumber} aria-hidden="true">01</span>
        Choose your dream
      </legend>

      <div className={styles.goalGrid}>
        {GOALS.map((goal) => {
          const checked = goal.id === value;
          return (
            <label key={goal.id} className={`${styles.goalCard} ${checked ? styles.goalCardSelected : ""}`}>
              <input
                type="radio"
                name="goal"
                value={goal.id}
                checked={checked}
                onChange={() => onChange(goal.id)}
                className={styles.visuallyHidden}
              />
              <span className={styles.goalIcon}>
                <Icon paths={goal.icon} />
              </span>
              <span className={styles.goalName}>{goal.name}</span>
              <span className={styles.goalBlurb}>{goal.blurb}</span>
              <span className={styles.goalCheck} aria-hidden="true">
                <Icon paths={["m5 12.5 4.5 4.5L19 7.5"]} size={14} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
