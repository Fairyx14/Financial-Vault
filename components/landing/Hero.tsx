import Link from "next/link";
import Icon from "@/components/Icon";
import { VAULT_HREF } from "@/components/site/nav";
import { ExampleBadge } from "./Section";
import styles from "./landing.module.css";

const CHECK = ["m5 12.5 4.5 4.5L19 7.5"];

export default function Hero() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Your money. Your goals. Your future.</p>
          <h1 id="hero-title" className={styles.heroTitle}>
            Every dream has a date. <em>Find yours.</em>
          </h1>
          <p className={styles.heroLead}>
            From everyday budgeting to long-term wealth building, Dream Vault brings your financial world together in one
            beautifully simple place. Track your money, plan your goals and take control of your financial future.
          </p>
          <div className={styles.ctaRow}>
            <Link href={VAULT_HREF} className={styles.buttonPrimary}>
              Start Your Journey
              <Icon paths={["M5 12h14", "m13 5 7 7-7 7"]} size={18} />
            </Link>
            <Link href="#features" className={styles.buttonSecondary}>
              Explore Features
            </Link>
          </div>
          <ul className={styles.heroPoints}>
            <li>
              <Icon paths={CHECK} size={16} /> No account needed
            </li>
            <li>
              <Icon paths={CHECK} size={16} /> Saved privately in your browser
            </li>
            <li>
              <Icon paths={CHECK} size={16} /> Savings Vault available now
            </li>
          </ul>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

/** Decorative dashboard mock-up. All figures are invented and never read or write real data. */
function HeroPreview() {
  return (
    <div
      className={styles.heroVisual}
      role="img"
      aria-label="Example dashboard with fictional figures: net worth £86,400, a dream home deposit 62% saved, an investment portfolio of £41,200 and monthly spending of £2,640."
    >
      <div className={styles.heroBadge}>
        <ExampleBadge />
      </div>

      <div className={styles.mockMain} aria-hidden="true">
        <div className={styles.mockHead}>
          <span>Net worth</span>
          <span className={styles.mockDelta}>+£1,240 this month</span>
        </div>
        <p className={styles.mockBig}>£86,400</p>
        <svg viewBox="0 0 300 90" className={styles.mockSpark} preserveAspectRatio="none">
          <defs>
            <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 74 L30 70 L60 72 L90 62 L120 60 L150 52 L180 50 L210 40 L240 36 L270 26 L300 18 L300 90 L0 90 Z" fill="url(#hero-spark)" />
          <path
            d="M0 74 L30 70 L60 72 L90 62 L120 60 L150 52 L180 50 L210 40 L240 36 L270 26 L300 18"
            className={styles.mockSparkLine}
            pathLength={1}
          />
        </svg>
        <div className={styles.mockTiles}>
          <div>
            <span>Savings</span>
            <strong>£24,680</strong>
          </div>
          <div>
            <span>Investments</span>
            <strong>£41,200</strong>
          </div>
        </div>
      </div>

      <div className={`${styles.floatCard} ${styles.floatRing}`} aria-hidden="true">
        <svg viewBox="0 0 64 64" className={styles.ring}>
          <circle cx="32" cy="32" r="26" className={styles.ringTrack} />
          <circle cx="32" cy="32" r="26" className={styles.ringValue} pathLength={100} style={{ "--ring-value": 62 } as React.CSSProperties} />
        </svg>
        <div>
          <p className={styles.floatLabel}>Dream home deposit</p>
          <p className={styles.floatValue}>62% saved</p>
          <p className={styles.floatMeta}>Est. June 2028</p>
        </div>
      </div>

      <div className={`${styles.floatCard} ${styles.floatSpend}`} aria-hidden="true">
        <p className={styles.floatLabel}>Spending this month</p>
        <p className={styles.floatValue}>£2,640</p>
        <div className={styles.miniBars}>
          {[62, 38, 74, 46, 88, 54, 70].map((height, i) => (
            <span key={i} style={{ height: `${height}%`, animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
