"use client";

import Icon from "@/components/Icon";
import { Decimal } from "@/lib/decimal";
import { GOAL_PRESETS, goalCurrentValue, type InvestmentGoal } from "@/lib/investmentGoals";
import type { PortfolioSummary } from "@/lib/investments";
import { formatDuration, formatMonthsFromNow } from "@/lib/plan";
import { projectGoal, type GoalProjection } from "@/lib/projections";
import { money } from "./format";
import vault from "../Vault.module.css";
import styles from "./planning.module.css";

interface GoalsProps {
  goals: InvestmentGoal[];
  portfolio: PortfolioSummary;
  onDelete: (goal: InvestmentGoal) => void;
}

export default function Goals({ goals, portfolio, onDelete }: GoalsProps) {
  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            Investment goals
          </h2>
          <p className={vault.viewSubtitle}>
            Set a target and see how long it could take under your own assumptions. Estimates only, not guarantees.
          </p>
        </div>
        <a href="#/goals/new" className={vault.buttonPrimary}>
          <Icon paths={["M12 5v14", "M5 12h14"]} size={18} />
          New goal
        </a>
      </div>

      {goals.length === 0 ? (
        <div className={vault.emptyState}>
          <span className={vault.emptyIcon}>
            <Icon paths={["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M12 12h.01"]} size={28} />
          </span>
          <h3 className={vault.emptyTitle}>Give your investing a destination</h3>
          <p className={vault.emptyText}>
            Build a £100,000 portfolio, save for retirement or set your own target, then see the milestones on the way.
          </p>
          <a href="#/goals/new" className={vault.buttonPrimary}>
            Create your first goal
          </a>
        </div>
      ) : (
        <ul className={styles.goalList}>
          {goals.map((goal) => (
            <li key={goal.id}>
              <GoalCard goal={goal} portfolio={portfolio} onDelete={() => onDelete(goal)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function sourceText(goal: InvestmentGoal, portfolio: PortfolioSummary): string {
  if (goal.source === "portfolio") return "Your whole portfolio, at the prices you've entered";
  if (goal.source === "manual") return "An amount you entered";
  const names = portfolio.holdings.filter((h) => goal.holdingIds.includes(h.investment.id)).map((h) => h.investment.name);
  return names.length ? `Selected holdings: ${names.join(", ")}` : "Selected holdings (none of them are tracked any more)";
}

export function GoalOutlook({ projection, monthly, returnPct }: { projection: GoalProjection; monthly: Decimal; returnPct: string }) {
  const assumptions = `at ${returnPct}% a year${monthly.isPositive() ? ` and ${money(monthly)} a month` : " with no monthly contributions"}`;
  if (projection.status === "reached") return <p className={styles.outlookGood}>You&rsquo;ve already reached this target.</p>;
  if (projection.status === "reachable") {
    return (
      <p className={styles.outlook}>
        Could take about <strong>{formatDuration(projection.months!)}</strong>, around{" "}
        <strong>{formatMonthsFromNow(projection.months!)}</strong> {assumptions}. This is a hypothetical date, not a promise.
      </p>
    );
  }
  const message =
    projection.reason === "no-growth"
      ? "With no monthly contributions and no growth, your balance won't change, so this target can't be reached. Try adding a monthly amount."
      : projection.reason === "levels-off"
        ? `With a negative return, losses eventually cancel out your contributions and the balance levels off at about ${money(projection.ceiling!)}, below your target.`
        : "Under these assumptions it would take more than 100 years.";
  return <p className={styles.outlookWarn}>{message}</p>;
}

function GoalCard({ goal, portfolio, onDelete }: { goal: InvestmentGoal; portfolio: PortfolioSummary; onDelete: () => void }) {
  const current = goalCurrentValue(goal, portfolio);
  const target = Decimal.parse(goal.target) ?? Decimal.ZERO;
  const monthly = Decimal.parse(goal.monthly) ?? Decimal.ZERO;
  const projection = projectGoal({ current, target, monthly, annualReturnPct: Decimal.parse(goal.returnPct) ?? Decimal.ZERO });
  const preset = GOAL_PRESETS.find((p) => p.id === goal.preset);
  const pct = projection.progressPct.toNumber();

  return (
    <article className={styles.goalCard} aria-labelledby={`goal-${goal.id}`}>
      <div className={styles.goalHead}>
        <div>
          <h3 id={`goal-${goal.id}`} className={styles.goalName}>
            {goal.name}
          </h3>
          {preset && preset.label !== goal.name && <p className={styles.goalType}>{preset.label}</p>}
        </div>
        <div className={styles.goalActions}>
          <a href={`#/goals/${goal.id}/edit`} className={vault.iconButton} aria-label={`Edit ${goal.name}`} title="Edit">
            <Icon paths={["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"]} size={16} />
          </a>
          <button type="button" className={vault.iconButton} onClick={onDelete} aria-label={`Delete ${goal.name}`} title="Delete">
            <Icon paths={["M4 7h16", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} size={16} />
          </button>
        </div>
      </div>

      <p className={styles.goalAmounts}>
        <strong>{money(current)}</strong> of {money(target)}
        <span className={styles.goalPct}> · {projection.progressPct.toFixed(1)}%</span>
      </p>

      <div
        className={styles.goalBar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`${goal.name}: ${projection.progressPct.toFixed(1)}% of target`}
      >
        <span className={styles.goalFill} style={{ width: `${pct}%` }} />
        {[25, 50, 75].map((mark) => (
          <span key={mark} className={`${styles.goalTick} ${pct >= mark ? styles.goalTickPassed : ""}`} style={{ left: `${mark}%` }} aria-hidden="true" />
        ))}
      </div>
      <p className={styles.goalSource}>{sourceText(goal, portfolio)}</p>

      <GoalOutlook projection={projection} monthly={monthly} returnPct={goal.returnPct} />

      <ol className={styles.milestones} aria-label="Milestones">
        {projection.milestones.map((m) => (
          <li key={m.fraction} className={m.months === 0 ? styles.milestoneDone : undefined}>
            <span className={styles.milestoneDot} aria-hidden="true" />
            <span className={styles.milestoneName}>
              {m.fraction * 100}% · {money(target.times(Decimal.of(String(m.fraction))))}
            </span>
            <span className={styles.milestoneWhen}>
              {m.months === 0 ? "Reached" : m.months === null ? "Not within 100 years" : `≈ ${formatMonthsFromNow(m.months)}`}
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}
