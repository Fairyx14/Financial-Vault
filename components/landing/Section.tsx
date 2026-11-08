import type { ReactNode } from "react";
import styles from "./landing.module.css";

interface SectionProps {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  /** "tinted" adds a soft band behind the section. */
  tone?: "plain" | "tinted";
  align?: "left" | "center";
}

/** A landing-page section with a consistent heading block. */
export default function Section({ id, eyebrow, title, lead, children, tone = "plain", align = "center" }: SectionProps) {
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} className={`${styles.section} ${tone === "tinted" ? styles.sectionTinted : ""}`}>
      <div className="container">
        <header className={`${styles.sectionHead} ${align === "left" ? styles.sectionHeadLeft : ""} ${styles.reveal}`}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h2 id={titleId} className={styles.sectionTitle}>
            {title}
          </h2>
          {lead && <p className={styles.sectionLead}>{lead}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

/** Small "Available" / "Coming soon" label. Always shows words, never colour alone. */
export function StatusChip({ status }: { status: "available" | "coming-soon" }) {
  return (
    <span className={`${styles.chip} ${status === "available" ? styles.chipAvailable : styles.chipSoon}`}>
      <span className={styles.chipDot} aria-hidden="true" />
      {status === "available" ? "Available now" : "Coming soon"}
    </span>
  );
}

/** Marks fictional marketing visuals so they're never mistaken for the visitor's data. */
export function ExampleBadge({ children = "Example · fictional data" }: { children?: ReactNode }) {
  return <span className={styles.exampleBadge}>{children}</span>;
}
