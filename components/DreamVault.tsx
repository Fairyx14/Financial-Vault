"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/plan";
import { currentBalance, type Entry } from "@/lib/vault";
import Dashboard from "./Dashboard";
import GoalDetail from "./GoalDetail";
import GoalForm from "./GoalForm";
import { routeKey, useHashRoute } from "./useHashRoute";
import { useVault } from "./useVault";
import styles from "./Vault.module.css";

/** App shell: loads the vault, picks the view from the URL hash and wires up actions. */
export default function DreamVault() {
  const { vault, storageWorks, setCurrency, addGoal, editGoal, deleteGoal, addEntry, deleteEntry } = useVault();
  const [route, navigate] = useHashRoute();
  const [announcement, setAnnouncement] = useState("");
  const firstView = useRef(true);
  const key = routeKey(route);

  // Move focus to the new view's heading so keyboard and screen-reader users know the page changed.
  useEffect(() => {
    if (!vault) return;
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    const heading = document.querySelector<HTMLElement>("[data-view-heading]");
    if (!heading) return;
    heading.focus({ preventScroll: true });
    // Bring the new view (not the hero) to the top of the screen.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (heading.closest("section") ?? heading).scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }, [key, vault === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!vault) {
    return (
      <p className={styles.loading} aria-busy="true">
        Opening your vault…
      </p>
    );
  }

  const { currency } = vault;
  const goal = "id" in route ? vault.goals.find((item) => item.id === route.id) : undefined;
  let view: React.ReactNode;

  if (route.view === "new") {
    view = (
      <GoalForm
        key="new"
        mode="create"
        currency={currency}
        cancelHref="#/"
        onSubmit={(draft, startingSavings) => {
          const id = addGoal(draft, startingSavings);
          setAnnouncement(`${draft.name} added to your vault.`);
          navigate(`#/goal/${id}`);
        }}
      />
    );
  } else if ("id" in route && !goal) {
    view = (
      <div className={styles.emptyState}>
        <h2 tabIndex={-1} data-view-heading className={styles.emptyTitle}>
          We couldn&rsquo;t find that goal
        </h2>
        <p className={styles.emptyText}>It may have been deleted.</p>
        <a href="#/" className={styles.buttonPrimary}>
          Back to your vaults
        </a>
      </div>
    );
  } else if (route.view === "edit" && goal) {
    view = (
      <GoalForm
        key={`edit-${goal.id}`}
        mode="edit"
        currency={currency}
        initial={goal}
        balance={currentBalance(goal)}
        cancelHref={`#/goal/${goal.id}`}
        onSubmit={(draft) => {
          editGoal(goal.id, draft);
          setAnnouncement("Changes saved.");
          navigate(`#/goal/${goal.id}`);
        }}
      />
    );
  } else if (route.view === "goal" && goal) {
    view = (
      <GoalDetail
        goal={goal}
        currency={currency}
        onAddEntry={(entry) => {
          addEntry(goal.id, entry);
          const amount = formatMoney(Math.abs(entry.amount), currency);
          setAnnouncement(entry.amount >= 0 ? `${amount} added to ${goal.name}.` : `${amount} withdrawn from ${goal.name}.`);
        }}
        onDeleteEntry={(entry: Entry) => {
          if (window.confirm(`Delete this entry of ${formatMoney(Math.abs(entry.amount), currency)}?`)) {
            deleteEntry(goal.id, entry.id);
            setAnnouncement("Entry deleted.");
          }
        }}
        onDeleteGoal={() => {
          if (window.confirm(`Delete "${goal.name}" and all of its history? This can't be undone.`)) {
            deleteGoal(goal.id);
            setAnnouncement(`${goal.name} deleted.`);
            navigate("#/");
          }
        }}
      />
    );
  } else {
    view = <Dashboard vault={vault} onCurrencyChange={setCurrency} />;
  }

  return (
    <div className={styles.app}>
      {!storageWorks && (
        <p className={styles.storageWarning} role="alert">
          This browser isn&rsquo;t letting Dream Vault save. Your goals will disappear when you close the page.
        </p>
      )}
      {view}
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
