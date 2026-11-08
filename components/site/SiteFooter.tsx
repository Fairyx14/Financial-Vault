import Link from "next/link";
import CurrentYear from "./CurrentYear";
import Logo from "./Logo";
import { SECTION_LINKS, VAULT_HREF } from "./nav";
import styles from "./site.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <div className={styles.footerBrand}>
          <Logo />
          <p className={styles.footerTagline}>Every dream has a date. Find yours.</p>
          <Link href={VAULT_HREF} className={styles.footerCta}>
            Open My Vault
          </Link>
        </div>

        <nav aria-label="Footer" className={styles.footerNav}>
          <ul>
            {SECTION_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className={`container ${styles.footerLegal}`}>
        <p>
          Dream Vault provides financial tracking tools and illustrative calculations for educational and informational
          purposes. It does not provide regulated financial, investment or tax advice. Actual outcomes may differ from
          projections.
        </p>
        <p>
          © <CurrentYear /> Dream Vault. Your savings goals are stored in your browser on this device only.
        </p>
      </div>
    </footer>
  );
}
