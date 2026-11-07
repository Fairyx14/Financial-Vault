import { formatDuration, formatMoney, formatMonthsFromNow, type CurrencyCode, type Plan } from "@/lib/plan";
import ProgressRing from "./ProgressRing";
import styles from "./DreamVault.module.css";

interface ResultsProps {
  plan: Plan | null;
  goalName: string;
  target: number;
  current: number;
  currency: CurrencyCode;
  hasGrowth: boolean;
}

export default function Results({ plan, goalName, target, current, currency, hasGrowth }: ResultsProps) {
  const money = (value: number) => formatMoney(value, currency);

  return (
    <section className={styles.results} aria-labelledby="results-title">
      <p className={styles.resultsEyebrow}>Your vault</p>
      <h2 id="results-title" className={styles.resultsTitle}>
        {goalName}
      </h2>

      {plan === null ? (
        <p className={styles.resultsEmpty} aria-live="polite">
          Fill in the amounts to see your timeline.
        </p>
      ) : (
        <>
          <ProgressRing progress={plan.progress} caption="saved" />

          {/* Announced to screen readers whenever the answer changes. */}
          <div className={styles.headline} aria-live="polite" aria-atomic="true">
            {plan.status === "reached" && (
              <>
                <p className={styles.headlineLead}>Congratulations</p>
                <p className={styles.headlineValue}>You&rsquo;ve already reached your goal</p>
                <p className={styles.headlineSub}>
                  You have {money(current)} saved against a {money(target)} target.
                </p>
              </>
            )}

            {plan.status === "on-track" && plan.months !== null && (
              <>
                <p className={styles.headlineLead}>You could get there in</p>
                <p className={styles.headlineValue}>{formatDuration(plan.months)}</p>
                <p className={styles.headlineSub}>
                  That&rsquo;s around <strong>{formatMonthsFromNow(plan.months)}</strong>
                </p>
              </>
            )}

            {plan.status === "out-of-reach" && (
              <>
                <p className={styles.headlineLead}>Not quite yet</p>
                <p className={styles.headlineValue}>Add a monthly amount to set a date</p>
                <p className={styles.headlineSub}>
                  At this rate the goal would take more than 100 years. Even a small monthly contribution changes
                  that.
                </p>
              </>
            )}
          </div>

          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Saved</dt>
              <dd>{money(current)}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Still to go</dt>
              <dd>{money(plan.remaining)}</dd>
            </div>
            {plan.status === "on-track" && (
              <div className={styles.stat}>
                <dt>You&rsquo;ll add</dt>
                <dd>{money(plan.contributions)}</dd>
              </div>
            )}
            {plan.status === "on-track" && hasGrowth && (
              <div className={styles.stat}>
                <dt>Growth</dt>
                <dd>{money(plan.growth)}</dd>
              </div>
            )}
          </dl>

          <div className={styles.milestones}>
            <h3 className={styles.milestonesTitle}>Milestones</h3>
            <ol className={styles.milestoneList}>
              {plan.milestones.map((milestone) => {
                const done = milestone.months === 0;
                const when = done
                  ? "Reached"
                  : milestone.months === null
                    ? "Not yet scheduled"
                    : formatMonthsFromNow(milestone.months);
                return (
                  <li key={milestone.fraction} className={`${styles.milestone} ${done ? styles.milestoneDone : ""}`}>
                    <span className={styles.milestoneDot} aria-hidden="true" />
                    <span className={styles.milestoneName}>
                      {milestone.fraction === 1 ? "Goal" : `${milestone.fraction * 100}%`}
                      <span className={styles.milestoneAmount}> · {money(target * milestone.fraction)}</span>
                    </span>
                    <span className={styles.milestoneWhen}>{when}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          {plan.tip && (
            <p className={styles.tip}>
              <span className={styles.tipLabel}>Tip</span>
              Adding just {money(plan.tip.extra)} a month would get you there{" "}
              {formatDuration(plan.tip.monthsSaved)} sooner.
            </p>
          )}
        </>
      )}
    </section>
  );
}
