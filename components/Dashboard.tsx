import { getGoal } from "@/lib/goals";
import { CURRENCIES, formatMoney, formatMonthsFromNow, type CurrencyCode } from "@/lib/plan";
import { currentBalance, forecastFor, paceFor, type SavedGoal, type VaultState } from "@/lib/vault";
import Icon from "./Icon";
import PaceBadge from "./PaceBadge";
import styles from "./Vault.module.css";

interface DashboardProps {
  vault: VaultState;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export default function Dashboard({ vault, onCurrencyChange }: DashboardProps) {
  const { goals, currency } = vault;
  const money = (value: number) => formatMoney(value, currency);

  const totalSaved = goals.reduce((sum, goal) => sum + Math.max(currentBalance(goal), 0), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const totalMonthly = goals.reduce((sum, goal) => sum + goal.monthly, 0);
  const onTrack = goals.filter((goal) => paceFor(goal).status !== "behind").length;

  return (
    <section aria-labelledby="view-title">
      <div className={styles.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={styles.viewTitle}>
            Your vaults
          </h2>
          <p className={styles.viewSubtitle}>
            {goals.length === 0
              ? "Start with one dream. You can add more any time."
              : `${goals.length} ${goals.length === 1 ? "goal" : "goals"} in progress`}
          </p>
        </div>

        <div className={styles.toolbarActions}>
          <label className={styles.inlineSelect}>
            <span className={styles.inlineSelectLabel}>Currency</span>
            <select value={currency} onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}>
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {CURRENCIES[code].label}
                </option>
              ))}
            </select>
          </label>
          <a href="#/new" className={styles.buttonPrimary}>
            <Icon paths={["M12 5v14", "M5 12h14"]} size={18} />
            New goal
          </a>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <Icon paths={["M12 2.5 20.5 8 12 21.5 3.5 8 12 2.5Z", "M3.5 8h17"]} size={28} />
          </span>
          <h3 className={styles.emptyTitle}>Your vault is waiting</h3>
          <p className={styles.emptyText}>
            Add a goal to see when you could reach it. Then log each deposit and watch the date get closer.
          </p>
          <a href="#/new" className={styles.buttonPrimary}>
            Create your first goal
          </a>
        </div>
      ) : (
        <>
          <dl className={styles.summary}>
            <div className={styles.summaryTile}>
              <dt>Total saved</dt>
              <dd>{money(totalSaved)}</dd>
            </div>
            <div className={styles.summaryTile}>
              <dt>Total targets</dt>
              <dd>{money(totalTarget)}</dd>
            </div>
            <div className={styles.summaryTile}>
              <dt>Saving each month</dt>
              <dd>{money(totalMonthly)}</dd>
            </div>
            <div className={styles.summaryTile}>
              <dt>On track</dt>
              <dd>
                {onTrack} of {goals.length}
              </dd>
            </div>
          </dl>

          <ul className={styles.goalList}>
            {goals.map((goal) => (
              <li key={goal.id}>
                <GoalCard goal={goal} currency={currency} />
              </li>
            ))}
            <li>
              <a href="#/new" className={styles.addCard}>
                <span className={styles.addCardIcon}>
                  <Icon paths={["M12 5v14", "M5 12h14"]} />
                </span>
                Add another goal
              </a>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

function GoalCard({ goal, currency }: { goal: SavedGoal; currency: CurrencyCode }) {
  const type = getGoal(goal.type);
  const balance = Math.max(currentBalance(goal), 0);
  const progress = Math.min(balance / goal.target, 1);
  const percent = Math.round(progress * 100);
  const forecast = forecastFor(goal);
  const pace = paceFor(goal);

  const eta =
    forecast.status === "reached"
      ? "Reached"
      : forecast.months === null
        ? "No date yet"
        : formatMonthsFromNow(forecast.months);

  return (
    <a href={`#/goal/${goal.id}`} className={styles.goalCard}>
      <div className={styles.goalCardHead}>
        <span className={styles.goalCardIcon}>
          <Icon paths={type.icon} />
        </span>
        <div className={styles.goalCardTitles}>
          <h3 className={styles.goalCardName}>{goal.name}</h3>
          <p className={styles.goalCardType}>{type.name}</p>
        </div>
      </div>

      <p className={styles.goalCardAmounts}>
        <strong>{formatMoney(balance, currency)}</strong> of {formatMoney(goal.target, currency)}
      </p>

      <div
        className={styles.bar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${goal.name}: ${percent}% saved`}
      >
        <span className={styles.barFill} style={{ width: `${percent}%` }} />
      </div>

      <div className={styles.goalCardFoot}>
        <span className={styles.goalCardEta}>
          <span className={styles.goalCardEtaLabel}>{percent}% · </span>
          {eta}
        </span>
        <PaceBadge pace={pace} currency={currency} />
      </div>
    </a>
  );
}
