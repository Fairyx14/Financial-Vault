import Link from "next/link";
import Icon from "@/components/Icon";
import Section from "./Section";
import styles from "./landing.module.css";

/* Every statement here must match how the app actually works (see lib/vault.ts). */
const FACTS = [
  {
    title: "Stored on your device",
    text: "Your savings goals and deposits are saved in your browser's local storage on this device. They aren't sent to a Dream Vault server.",
    icon: ["M4 5h16v11H4z", "M8 20h8", "M12 16v4"],
  },
  {
    title: "No account or sign-in",
    text: "You don't need to create an account or share an email address to use the Savings Vault.",
    icon: ["M20 21a8 8 0 0 0-16 0", "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"],
  },
  {
    title: "No bank connections",
    text: "Dream Vault never connects to your bank. Every figure is one you've typed in yourself.",
    icon: ["M3 10h18", "M5 10v8", "M10 10v8", "M14 10v8", "M19 10v8", "M3 21h18", "M12 3l9 5H3l9-5Z"],
  },
  {
    title: "You're in control",
    text: "Edit or delete any goal or entry at any time. Clearing your browser's site data removes everything.",
    icon: ["M4 7h16", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"],
  },
];

export default function Privacy() {
  return (
    <Section
      id="privacy-overview"
      eyebrow="Trust & privacy"
      title="Your financial life deserves thoughtful protection."
      lead="Here's exactly how Dream Vault handles your information today, in plain English."
      tone="tinted"
    >
      <ul className={styles.factGrid}>
        {FACTS.map((fact) => (
          <li key={fact.title} className={`${styles.factCard} ${styles.reveal}`}>
            <span className={styles.factIcon}>
              <Icon paths={fact.icon} />
            </span>
            <div>
              <h3 className={styles.factTitle}>{fact.title}</h3>
              <p className={styles.factText}>{fact.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className={`${styles.honestBox} ${styles.reveal}`}>
        <h3 className={styles.honestTitle}>
          <Icon paths={["M12 8v5", "M12 16.5h.01", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"]} size={20} />
          Good to know
        </h3>
        <ul>
          <li>Your goals don&rsquo;t sync between devices or browsers. There&rsquo;s no cloud backup yet.</li>
          <li>Anyone using the same browser profile on this device can see your vault.</li>
          <li>Private or incognito windows may erase your data when they close.</li>
        </ul>
        <Link href="/privacy" className={styles.simLinkDark}>
          Read the full privacy notice
          <Icon paths={["M5 12h14", "m13 5 7 7-7 7"]} size={16} />
        </Link>
      </div>
    </Section>
  );
}
