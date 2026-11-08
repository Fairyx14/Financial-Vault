import Icon from "@/components/Icon";
import Section from "./Section";
import styles from "./landing.module.css";

const BENEFITS = [
  {
    title: "Everything in one place",
    text: "Organise your financial goals and information without juggling multiple spreadsheets.",
    icon: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  },
  {
    title: "Understand your progress",
    text: "See your financial position through simple charts, visualisations and milestones.",
    icon: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
  },
  {
    title: "Plan with confidence",
    text: "Explore estimates and scenarios to help make informed financial decisions.",
    icon: ["M12 3 20 6v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6l8-3Z", "m8.8 12 2.2 2.2 4.2-4.4"],
  },
  {
    title: "Built around your goals",
    text: "Whether you're saving your first £1,000 or planning for retirement, Dream Vault adapts to your priorities.",
    icon: ["M12 20.5s-7.5-4.6-9.3-9.4A5 5 0 0 1 12 6.6a5 5 0 0 1 9.3 4.5C19.5 15.9 12 20.5 12 20.5Z"],
  },
];

export default function Benefits() {
  return (
    <Section
      id="about"
      eyebrow="Why Dream Vault?"
      title="Because financial freedom starts with clarity."
      lead="Dream Vault began as a simple savings goal planner and is growing, one vault at a time, into a calm home for your whole financial life. Our aim is simple: help you see where you are, where you're heading and what could help you get there."
    >
      <ul className={styles.benefitGrid}>
        {BENEFITS.map((benefit) => (
          <li key={benefit.title} className={`${styles.benefitCard} ${styles.reveal}`}>
            <span className={styles.benefitIcon}>
              <Icon paths={benefit.icon} />
            </span>
            <h3 className={styles.benefitTitle}>{benefit.title}</h3>
            <p className={styles.benefitText}>{benefit.text}</p>
          </li>
        ))}
      </ul>
      <p className={`${styles.smallNote} ${styles.centerText} ${styles.reveal}`}>
        Projections are estimates based on the figures you enter. They aren&rsquo;t guarantees, and investment values can
        go down as well as up.
      </p>
    </Section>
  );
}
