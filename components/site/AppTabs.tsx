import Link from "next/link";
import Icon from "@/components/Icon";
import styles from "./site.module.css";

const TABS = [
  {
    id: "savings",
    label: "Savings Vault",
    href: "/vault",
    icon: ["M4 5h16v14H4z", "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"],
  },
  { id: "investments", label: "Investment Vault", href: "/investments", icon: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"] },
] as const;

/** Switches between the working vaults. Shown at the top of each app page. */
export default function AppTabs({ current }: { current: (typeof TABS)[number]["id"] }) {
  return (
    <nav aria-label="Your vaults" className={`container ${styles.appTabsWrap}`}>
      <ul className={styles.appTabs}>
        {TABS.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              className={`${styles.appTab} ${tab.id === current ? styles.appTabActive : ""}`}
              aria-current={tab.id === current ? "page" : undefined}
            >
              <Icon paths={[...tab.icon]} size={16} />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
