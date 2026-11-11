import Link from "next/link";
import Icon from "@/components/Icon";
import { VAULT_HREF } from "@/components/site/nav";
import Section, { ExampleBadge } from "./Section";
import styles from "./landing.module.css";

/* Invented figures for illustration only. Nothing here touches a visitor's saved goals. */
const STATS = [
  { label: "Total savings", value: "£24,680", note: "+£850 this month" },
  { label: "Investment portfolio", value: "£41,200", note: "+3.1% this year" },
  { label: "Monthly income", value: "£3,850", note: "After tax" },
  { label: "Monthly expenses", value: "£2,640", note: "£260 under budget" },
];

const GOALS = [
  // Adds up to the £24,680 total savings above.
  { name: "Dream home deposit", saved: 18600, target: 30000 },
  { name: "Wedding", saved: 3580, target: 12000 },
  { name: "Emergency fund", saved: 2500, target: 6000 },
];

const SPENDING = [
  { name: "Housing", amount: 1000 },
  { name: "Bills", amount: 320 },
  { name: "Food", amount: 380 },
  { name: "Transport", amount: 240 },
  { name: "Leisure", amount: 260 },
  { name: "Other", amount: 440 },
];

/** Net worth, end of each month (thousands of pounds). */
const NET_WORTH = [71.2, 72.0, 73.4, 73.1, 74.9, 76.3, 77.8, 78.6, 80.4, 82.1, 84.0, 86.4];
const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

const money = (value: number) => `£${value.toLocaleString("en-GB")}`;

export default function DashboardPreview() {
  const totalSpend = SPENDING.reduce((sum, item) => sum + item.amount, 0);
  const maxSpend = Math.max(...SPENDING.map((item) => item.amount));

  // Chart geometry
  const W = 560;
  const H = 200;
  const pad = { l: 40, r: 12, t: 16, b: 26 };
  const min = 70;
  const max = 90;
  const x = (i: number) => pad.l + (i / (NET_WORTH.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const line = NET_WORTH.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
  const area = `${line}L${x(NET_WORTH.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z`;

  return (
    <Section
      id="dashboard-preview"
      eyebrow="Dashboard preview"
      title="Your entire financial world. Beautifully organised."
      lead="A glimpse of where Dream Vault is heading: savings, investments, spending and net worth side by side."
    >
      <div className={`${styles.dashFrame} ${styles.reveal}`}>
        <div className={styles.dashBar}>
          <span className={styles.dashDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <ExampleBadge>Example dashboard · fictional data</ExampleBadge>
        </div>

        <div className={styles.dashGrid}>
          <div className={styles.dashNetWorth}>
            <p className={styles.dashLabel}>Net worth</p>
            <p className={styles.dashHero}>£86,400</p>
            <p className={styles.dashNote}>Assets £98,150 · Liabilities £11,750</p>
          </div>

          <dl className={styles.dashStats}>
            {STATS.map((stat) => (
              <div key={stat.label} className={styles.dashStat}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
                <dd className={styles.dashNote}>{stat.note}</dd>
              </div>
            ))}
          </dl>

          <figure className={`${styles.dashPanel} ${styles.dashChart}`}>
            <figcaption className={styles.dashPanelTitle}>
              Financial progress <span>Net worth, last 12 months</span>
            </figcaption>
            <svg viewBox={`0 0 ${W} ${H}`} className={styles.dashSvg} role="img" aria-label="Example line chart: net worth rising from £71,200 to £86,400 over 12 months.">
              <defs>
                <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "var(--color-primary)" }} stopOpacity="0.2" />
                  <stop offset="100%" style={{ stopColor: "var(--color-primary)" }} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[70, 75, 80, 85, 90].map((tick) => (
                <g key={tick}>
                  <line x1={pad.l} x2={W - pad.r} y1={y(tick)} y2={y(tick)} className={styles.dashGrid1} />
                  <text x={pad.l - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className={styles.dashAxis}>
                    £{tick}k
                  </text>
                </g>
              ))}
              {MONTHS.map((month, i) =>
                i % 2 === 1 ? (
                  <text key={month} x={x(i)} y={H - 6} textAnchor="middle" className={styles.dashAxis}>
                    {month}
                  </text>
                ) : null,
              )}
              <path d={area} fill="url(#dash-area)" />
              <path d={line} className={styles.dashLine} pathLength={1} />
              <circle cx={x(NET_WORTH.length - 1)} cy={y(NET_WORTH[NET_WORTH.length - 1])} r={5} className={styles.dashDot} />
            </svg>
          </figure>

          <div className={styles.dashPanel}>
            <p className={styles.dashPanelTitle}>Savings goals</p>
            <ul className={styles.dashGoals}>
              {GOALS.map((goal) => {
                const percent = Math.round((goal.saved / goal.target) * 100);
                return (
                  <li key={goal.name}>
                    <div className={styles.dashGoalRow}>
                      <span>{goal.name}</span>
                      <strong>{percent}%</strong>
                    </div>
                    <span className={styles.dashTrack} aria-hidden="true">
                      <span style={{ width: `${percent}%` }} />
                    </span>
                    <span className={styles.dashNote}>
                      {money(goal.saved)} of {money(goal.target)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={`${styles.dashPanel} ${styles.dashSpendPanel}`}>
            <p className={styles.dashPanelTitle}>
              Spending breakdown <span>{money(totalSpend)} this month</span>
            </p>
            <ul className={styles.dashSpend}>
              {SPENDING.map((item) => (
                <li key={item.name}>
                  <span className={styles.dashSpendName}>{item.name}</span>
                  <span className={styles.dashSpendBar} aria-hidden="true">
                    <span style={{ width: `${(item.amount / maxSpend) * 100}%` }} />
                  </span>
                  <span className={styles.dashSpendValue}>{money(item.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={`${styles.centerCta} ${styles.reveal}`}>
        <Link href={VAULT_HREF} className={styles.buttonPrimary}>
          Explore Your Dashboard
          <Icon paths={["M5 12h14", "m13 5 7 7-7 7"]} size={18} />
        </Link>
        <p className={styles.smallNote}>
          Savings goals and investments are tracked today, each in its own vault. Spending, net-worth and the combined
          dashboard are coming soon.
        </p>
      </div>
    </Section>
  );
}
