import Icon from "@/components/Icon";
import styles from "./planning.module.css";

export type VaultTab = "portfolio" | "calculator" | "goals";

const TABS: { id: VaultTab; label: string; href: string; icon: string[] }[] = [
  { id: "portfolio", label: "Portfolio", href: "#/", icon: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"] },
  {
    id: "calculator",
    label: "Growth calculator",
    href: "#/calculator",
    icon: ["M6 3h12v18H6z", "M9 7h6", "M9 12h.01", "M12 12h.01", "M15 12h.01", "M9 16h.01", "M12 16h.01", "M15 16h.01"],
  },
  { id: "goals", label: "Goals", href: "#/goals", icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M12 12h.01"] },
];

/** Switches between the tracker and the planning tools inside the Investment Vault. */
export default function VaultTabs({ current }: { current: VaultTab }) {
  return (
    <nav aria-label="Investment Vault sections" className={styles.tabs}>
      {TABS.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          className={`${styles.tab} ${tab.id === current ? styles.tabActive : ""}`}
          aria-current={tab.id === current ? "page" : undefined}
        >
          <Icon paths={tab.icon} size={16} />
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
