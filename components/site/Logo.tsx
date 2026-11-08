import Link from "next/link";
import styles from "./site.module.css";

/** Brand mark + wordmark, linking home. */
export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`${styles.logo} ${light ? styles.logoLight : ""}`} aria-label="Dream Vault home">
      <span className={styles.logoMark} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 2.5 20.5 8 12 21.5 3.5 8 12 2.5Z" />
          <path d="M3.5 8h17M12 2.5 8.5 8 12 21.5 15.5 8 12 2.5Z" />
        </svg>
      </span>
      <span aria-hidden="true">Dream Vault</span>
    </Link>
  );
}
