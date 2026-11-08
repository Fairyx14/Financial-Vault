import Link from "next/link";
import Icon from "@/components/Icon";
import { FEATURES, type Feature } from "@/lib/features";
import Section, { StatusChip } from "./Section";
import styles from "./landing.module.css";

export default function FeatureGrid() {
  const available = FEATURES.filter((feature) => feature.status === "available").length;
  return (
    <Section
      id="features"
      eyebrow="The Dream Vault family"
      title="One place for every part of your financial life."
      lead="Your finances are more than a bank balance. They're the dreams you're saving for, the investments you're growing, the bills you're managing and the future you're building."
    >
      <p className={`${styles.roadmapNote} ${styles.reveal}`}>
        <strong>{available} of {FEATURES.length} vaults are ready today.</strong> The rest are on our roadmap and
        clearly marked <em>Coming soon</em>.
      </p>
      <ul className={styles.featureGrid}>
        {FEATURES.map((feature) => (
          <li key={feature.id} className={styles.reveal}>
            <FeatureCard feature={feature} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const available = feature.status === "available" && feature.href;
  return (
    <article className={`${styles.featureCard} ${available ? styles.featureCardLive : styles.featureCardSoon}`}>
      <div className={styles.featureTop}>
        <span className={styles.featureIcon}>
          <Icon paths={feature.icon} />
        </span>
        <StatusChip status={feature.status} />
      </div>
      <h3 className={styles.featureName}>{feature.name}</h3>
      <p className={styles.featureTagline}>{feature.tagline}</p>
      <p className={styles.featureText}>{feature.description}</p>
      {available && (
        <Link href={feature.href!} className={styles.featureLink}>
          Open {feature.name}
          <Icon paths={["M5 12h14", "m13 5 7 7-7 7"]} size={16} />
        </Link>
      )}
    </article>
  );
}
