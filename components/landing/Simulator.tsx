import Link from "next/link";
import Icon from "@/components/Icon";
import { VAULT_HREF } from "@/components/site/nav";
import { PLANNED_TOOLS } from "@/lib/features";
import { ExampleBadge, StatusChip } from "./Section";
import styles from "./landing.module.css";

const QUESTIONS = [
  "What if I saved an extra £200 per month?",
  "How soon could I afford a house deposit?",
  "What if I increased my pension contributions?",
  "How might different investment returns affect my future?",
  "What if I paid off my debts sooner?",
];

export default function Simulator() {
  return (
    <section id="tools" aria-labelledby="tools-title" className={`${styles.section} ${styles.simSection}`}>
      <div className={`container ${styles.simInner}`}>
        <div className={`${styles.simCopy} ${styles.reveal}`}>
          <p className={styles.eyebrowLight}>Financial tools · Future Simulator</p>
          <h2 id="tools-title" className={styles.simTitle}>
            What if your money could show you what&rsquo;s possible?
          </h2>
          <p className={styles.simLead}>
            Explore how small changes today could shape your financial future. Save a little more, spend a little less or
            adjust your assumptions to see how your plans might change.
          </p>
          <div className={styles.simStatus}>
            <StatusChip status="coming-soon" />
            <span>The Future Simulator is in development.</span>
          </div>

          <p className={styles.simSubhead}>Questions you&rsquo;ll be able to explore</p>
          <ul className={styles.simQuestions}>
            {QUESTIONS.map((question) => (
              <li key={question}>
                <Icon paths={["M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3", "M12 17h.01", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"]} size={18} />
                {question}
              </li>
            ))}
          </ul>

          <div className={styles.simToday}>
            <p>
              <strong>Available today:</strong> in the Savings Vault you can already change your monthly contribution or
              expected growth and watch your goal date move.
            </p>
            <Link href={VAULT_HREF} className={styles.simLink}>
              Try it in the Savings Vault
              <Icon paths={["M5 12h14", "m13 5 7 7-7 7"]} size={16} />
            </Link>
          </div>
        </div>

        <div className={`${styles.simVisual} ${styles.reveal}`}>
          <div
            className={styles.simCard}
            role="img"
            aria-label="Illustration of the planned Future Simulator. Example: saving an extra £200 a month moves a fictional house deposit goal from June 2030 to August 2029."
          >
            <div className={styles.simCardHead} aria-hidden="true">
              <ExampleBadge>Preview · not yet interactive</ExampleBadge>
            </div>
            <div aria-hidden="true">
              <p className={styles.simQuestion}>What if I saved an extra £200 per month?</p>
              <div className={styles.simSlider}>
                <span className={styles.simSliderLabel}>Monthly saving</span>
                <span className={styles.simSliderTrack}>
                  <span className={styles.simSliderFill} />
                  <span className={styles.simSliderThumb} />
                </span>
                <span className={styles.simSliderValue}>£650 → £850</span>
              </div>
              <div className={styles.simCompare}>
                <div>
                  <span>Current plan</span>
                  <strong>June 2030</strong>
                  <span className={styles.simBar}>
                    <span style={{ width: "100%" }} />
                  </span>
                </div>
                <div className={styles.simCompareBetter}>
                  <span>With +£200 a month</span>
                  <strong>August 2029</strong>
                  <span className={styles.simBar}>
                    <span style={{ width: "77%" }} />
                  </span>
                </div>
              </div>
              <p className={styles.simResult}>
                <Icon paths={["M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"]} size={16} />
                10 months sooner in this example
              </p>
            </div>
          </div>

          <div className={styles.toolList}>
            <p className={styles.toolListTitle}>Calculators on the roadmap</p>
            <ul>
              {PLANNED_TOOLS.map((tool) => (
                <li key={tool}>
                  {tool}
                  <span className={styles.toolSoon}>Coming soon</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
