import { getGoal } from "@/lib/goals";
import { formatMoney, type CurrencyCode } from "@/lib/plan";
import { currentBalance, forecastFor, formatDay, paceFor, type Entry, type SavedGoal } from "@/lib/vault";
import EntryForm from "./EntryForm";
import EntryList from "./EntryList";
import Icon from "./Icon";
import JourneyChart from "./JourneyChart";
import PaceBadge from "./PaceBadge";
import Results from "./Results";
import styles from "./Vault.module.css";

interface GoalDetailProps {
  goal: SavedGoal;
  currency: CurrencyCode;
  onAddEntry: (entry: Omit<Entry, "id">) => void;
  onDeleteEntry: (entry: Entry) => void;
  onDeleteGoal: () => void;
}

export default function GoalDetail({ goal, currency, onAddEntry, onDeleteEntry, onDeleteGoal }: GoalDetailProps) {
  const type = getGoal(goal.type);
  const balance = currentBalance(goal);
  const forecast = forecastFor(goal);
  const pace = paceFor(goal);
  const money = (value: number) => formatMoney(value, currency);

  const paceSentence = {
    reached: "You've hit your target. Time to celebrate, or set a new dream.",
    ahead: `Your plan expected ${money(pace.expected)} by now, and you're beyond it. Lovely work.`,
    "on-track": `Your plan expected ${money(pace.expected)} by now, and you're right on schedule.`,
    behind: `Your plan expected ${money(pace.expected)} by now. A deposit or two will close the gap.`,
  }[pace.status];

  return (
    <section aria-labelledby="view-title">
      <a href="#/" className={styles.backLink}>
        <Icon paths={["M19 12H5", "m12 19-7-7 7-7"]} size={16} />
        All goals
      </a>

      <div className={styles.detailHeader}>
        <div className={styles.detailTitleGroup}>
          <span className={styles.detailIcon}>
            <Icon paths={type.icon} size={26} />
          </span>
          <div>
            <h2 id="view-title" tabIndex={-1} data-view-heading className={styles.viewTitle}>
              {goal.name}
            </h2>
            <p className={styles.viewSubtitle}>
              {type.name} · started {formatDay(goal.createdAt)} · {money(goal.monthly)} a month
            </p>
          </div>
        </div>
        <div className={styles.detailActions}>
          <a href={`#/goal/${goal.id}/edit`} className={styles.buttonSecondary}>
            <Icon paths={["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"]} size={16} />
            Edit goal
          </a>
          <button type="button" className={styles.buttonDanger} onClick={onDeleteGoal}>
            <Icon paths={["M4 7h16", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} size={16} />
            Delete
          </button>
        </div>
      </div>

      <div className={styles.detailLayout}>
        <div className={styles.detailForecast}>
          <Results
            plan={forecast}
            eyebrow="Forecast"
            title="Where you're heading"
            headingLevel="h3"
            target={goal.target}
            current={Math.max(balance, 0)}
            currency={currency}
            hasGrowth={goal.annualRate > 0}
          />
        </div>

        <div className={styles.detailJourney}>
          <section className={styles.card} aria-labelledby="journey-title">
            <div className={styles.cardHead}>
              <h3 id="journey-title" className={styles.cardTitle}>
                Your journey
              </h3>
              <PaceBadge pace={pace} currency={currency} />
            </div>
            <p className={styles.muted}>{paceSentence}</p>
            <JourneyChart goal={goal} currency={currency} />
          </section>

          <section className={styles.card} aria-labelledby="log-title">
            <h3 id="log-title" className={styles.cardTitle}>
              Log a deposit
            </h3>
            <EntryForm goalId={goal.id} balance={balance} currency={currency} onAdd={onAddEntry} />
          </section>

          <section className={styles.card} aria-labelledby="history-title">
            <h3 id="history-title" className={styles.cardTitle}>
              History
            </h3>
            <EntryList entries={goal.entries} currency={currency} onDelete={onDeleteEntry} />
          </section>
        </div>
      </div>
    </section>
  );
}
