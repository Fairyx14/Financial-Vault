"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { SECTION_LINKS, VAULT_HREF } from "./nav";
import ThemeToggle from "./ThemeToggle";
import styles from "./site.module.css";

interface SiteHeaderProps {
  /** Which page is showing, so the CTA can reflect it. */
  current?: "home" | "vault" | "other";
}

/** Sticky navigation bar with a disclosure menu on small screens. */
export default function SiteHeader({ current = "other" }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on Escape (returning focus to the toggle) and when the layout grows past the mobile breakpoint.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 960px)");
    const onResize = () => desktop.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`${styles.header} ${scrolled || open ? styles.headerRaised : ""}`}>
      <div className={`container ${styles.headerInner}`}>
        <Logo />

        <div className={styles.headerEnd}>
        <nav aria-label="Main" className={styles.nav}>
          <button
            ref={toggleRef}
            type="button"
            className={styles.menuToggle}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span className={`${styles.menuIcon} ${open ? styles.menuIconOpen : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
          </button>

          <div id="site-menu" className={`${styles.menu} ${open ? styles.menuOpen : ""}`}>
            <ul className={styles.navList}>
              {SECTION_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.navLink} onClick={close}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={VAULT_HREF}
              className={styles.navCta}
              onClick={close}
              aria-current={current === "vault" ? "page" : undefined}
            >
              Open My Vault
            </Link>
          </div>
        </nav>
        <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
