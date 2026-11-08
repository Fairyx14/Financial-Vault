import Icon from "@/components/Icon";
import Section from "./Section";
import styles from "./landing.module.css";

const STEPS = [
  {
    title: "Build your financial picture",
    text: "Enter your savings goals, income, expenses, investments and other relevant financial information.",
    icon: ["M4 20h16", "M6 16V10", "M10 16V6", "M14 16v-4", "M18 16V8"],
  },
  {
    title: "Understand your money",
    text: "Explore clear dashboards, helpful visualisations, financial breakdowns and projections.",
    icon: ["M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z", "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"],
  },
  {
    title: "Plan your next move",
    text: "Set goals, compare scenarios and track your progress towards the future you want.",
    icon: ["M4 21V4", "M4 4h12l-2 4 2 4H4"],
  },
];

export default function Steps() {
  return (
    <Section id="how-it-works" eyebrow="How it works" title="Financial clarity in three simple steps." tone="tinted">
      <ol className={styles.steps}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={`${styles.step} ${styles.reveal}`}>
            <span className={styles.stepNumber} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={styles.stepIcon}>
              <Icon paths={step.icon} />
            </span>
            <h3 className={styles.stepTitle}>
              <span className="visually-hidden">Step {index + 1}: </span>
              {step.title}
            </h3>
            <p className={styles.stepText}>{step.text}</p>
          </li>
        ))}
      </ol>
      <p className={`${styles.stepsNote} ${styles.reveal}`}>
        Today you can do all three for your savings goals. Income, expenses and investments arrive with the upcoming
        vaults.
      </p>
    </Section>
  );
}
