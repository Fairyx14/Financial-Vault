import Link from "next/link";
import Icon from "@/components/Icon";
import { VAULT_HREF } from "@/components/site/nav";
import styles from "./landing.module.css";

export default function FinalCta() {
  return (
    <section className={`container ${styles.finalWrap}`} aria-labelledby="final-title">
      <div className={`${styles.final} ${styles.reveal}`}>
        <h2 id="final-title" className={styles.finalTitle}>
          Your future is worth planning for.
        </h2>
        <p className={styles.finalLead}>
          Big dreams begin with small steps. Start tracking your money, setting meaningful goals and building a clearer
          picture of your financial future.
        </p>
        <div className={`${styles.ctaRow} ${styles.ctaRowCenter}`}>
          <Link href={VAULT_HREF} className={styles.buttonLight}>
            Open Dream Vault
            <Icon paths={["M5 12h14", "m13 5 7 7-7 7"]} size={18} />
          </Link>
          <Link href="#features" className={styles.buttonOutlineLight}>
            Discover the Features
          </Link>
        </div>
      </div>
    </section>
  );
}
