import type { ReactNode } from "react";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import styles from "./legal.module.css";

/** Shared layout for short text pages such as Privacy and Terms. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className={`container ${styles.page}`}>
        <article className={styles.article}>
          <p className={styles.eyebrow}>Dream Vault</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.updated}>Last updated {updated}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
