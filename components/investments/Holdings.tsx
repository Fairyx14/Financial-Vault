"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { CATEGORIES, categoryLabel, type CategoryId, type PortfolioHolding } from "@/lib/investments";
import { money, unitPrice, units } from "./format";
import GainLoss from "./GainLoss";
import styles from "./investments.module.css";

type SortKey = "value" | "gain" | "return" | "name" | "recent";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "value", label: "Current value (high to low)" },
  { id: "gain", label: "Unrealised gain (high to low)" },
  { id: "return", label: "Unrealised return % (high to low)" },
  { id: "name", label: "Name (A to Z)" },
  { id: "recent", label: "Recently added" },
];

function sortHoldings(list: PortfolioHolding[], key: SortKey): PortfolioHolding[] {
  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (key) {
      case "value":
        return b.summary.valueGBP.compare(a.summary.valueGBP);
      case "gain":
        return b.summary.gainGBP.compare(a.summary.gainGBP);
      case "return": {
        // Holdings with no return figure go last.
        if (!a.summary.returnPct) return 1;
        if (!b.summary.returnPct) return -1;
        return b.summary.returnPct.compare(a.summary.returnPct);
      }
      case "name":
        return a.investment.name.localeCompare(b.investment.name, "en-GB");
      case "recent":
        return list.indexOf(b) - list.indexOf(a);
    }
  });
  return sorted;
}

export default function Holdings({ holdings }: { holdings: PortfolioHolding[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [sort, setSort] = useState<SortKey>("value");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = holdings.filter(({ investment }) => {
      if (category !== "all" && investment.category !== category) return false;
      if (!q) return true;
      return [investment.name, investment.ticker, investment.account].some((text) => text.toLowerCase().includes(q));
    });
    return sortHoldings(filtered, sort);
  }, [holdings, query, category, sort]);

  const usedCategories = CATEGORIES.filter((c) => holdings.some(({ investment }) => investment.category === c.id));

  return (
    <section aria-labelledby="holdings-title" className={styles.holdings}>
      <div className={styles.holdingsHead}>
        <h3 id="holdings-title" className={styles.sectionTitle}>
          Holdings
        </h3>
        <p className={styles.resultCount} aria-live="polite">
          Showing {visible.length} of {holdings.length}
        </p>
      </div>

      <div className={styles.filters}>
        <label className={styles.searchField}>
          <span className="visually-hidden">Search holdings</span>
          <Icon paths={["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z", "m20 20-4-4"]} size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, ticker or account"
            autoComplete="off"
          />
        </label>
        <label className={styles.selectField}>
          <span className={styles.selectLabel}>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as CategoryId | "all")}>
            <option value="all">All categories</option>
            {usedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.selectField}>
          <span className={styles.selectLabel}>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className={styles.noResults}>No holdings match your search.</p>
      ) : (
        <>
          {/* Wide screens: a table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Investment</th>
                  <th scope="col" className={styles.num}>Quantity</th>
                  <th scope="col" className={styles.num}>Avg. cost</th>
                  <th scope="col" className={styles.num}>Invested</th>
                  <th scope="col" className={styles.num}>Current value</th>
                  <th scope="col" className={styles.num}>Unrealised gain / loss</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ investment, summary }) => (
                  <tr
                    key={investment.id}
                    className={styles.row}
                    // Mouse convenience; the name link is the keyboard and screen-reader route.
                    onClick={(event) => {
                      if (!(event.target as HTMLElement).closest("a")) window.location.hash = `#/holding/${investment.id}`;
                    }}
                  >
                    <th scope="row">
                      <a href={`#/holding/${investment.id}`} className={styles.rowLink}>
                        {investment.name}
                      </a>
                      <span className={styles.rowMeta}>
                        {[investment.ticker, categoryLabel(investment.category), investment.currency !== "GBP" ? investment.currency : "", summary.quantity.isZero() ? "Fully sold" : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </th>
                    <td className={styles.num}>{units(summary.quantity)}</td>
                    <td className={styles.num}>
                      {summary.averageCost ? unitPrice(summary.averageCost, investment.currency) : "–"}
                    </td>
                    <td className={styles.num}>{money(summary.investedGBP)}</td>
                    <td className={styles.num}>{money(summary.valueGBP)}</td>
                    <td className={styles.num}>
                      <GainLoss amount={summary.gainGBP} percent={summary.returnPct} layout="stack" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Small screens: cards */}
          <ul className={styles.cards}>
            {visible.map(({ investment, summary }) => (
              <li key={investment.id}>
                <a href={`#/holding/${investment.id}`} className={styles.card}>
                  <span className={styles.cardHead}>
                    <span className={styles.cardName}>{investment.name}</span>
                    <span className={styles.rowMeta}>
                      {[investment.ticker, categoryLabel(investment.category), summary.quantity.isZero() ? "Fully sold" : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className={styles.cardValue}>{money(summary.valueGBP)}</span>
                  <GainLoss amount={summary.gainGBP} percent={summary.returnPct} />
                  <span className={styles.cardStats}>
                    <span>
                      <span className={styles.cardStatLabel}>Quantity</span>
                      {units(summary.quantity)}
                    </span>
                    <span>
                      <span className={styles.cardStatLabel}>Avg. cost</span>
                      {summary.averageCost ? unitPrice(summary.averageCost, investment.currency) : "–"}
                    </span>
                    <span>
                      <span className={styles.cardStatLabel}>Invested</span>
                      {money(summary.investedGBP)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className={styles.tableNote}>
        Average cost is per unit in the investment&rsquo;s own currency and includes fees. &ldquo;Invested&rdquo; is the cost
        of the units you still hold. Other amounts are in GBP; open a holding for realised gains and dividends.
      </p>
    </section>
  );
}
