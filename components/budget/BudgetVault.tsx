"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Icon from "@/components/Icon";
import { copyBudgets, monthRange, occurrences, type Frequency } from "@/lib/budget";
import { formatDay, todayISO } from "@/lib/vault";
import ConfirmDialog, { type ConfirmRequest } from "../ConfirmDialog";
import { useHashPath } from "../useHashPath";
import BudgetDashboard from "./BudgetDashboard";
import { monthLabel } from "./MonthPicker";
import EntryList from "./EntryList";
import { useBudget } from "./useBudget";
import vault from "../Vault.module.css";
import tabs from "../investments/planning.module.css";
import styles from "./budget.module.css";

/*
 * The dashboard and lists load with the page. Every other screen downloads only when it's
 * first opened (or when its tab is pointed at or focused), so the first visit is lighter.
 */
const loadAnalytics = () => import("./AnalyticsView");
const loadBills = () => import("./BillsView");
const loadBudgets = () => import("./BudgetsView");
const loadCalendar = () => import("./CalendarView");
const loadExport = () => import("./ExportView");
const loadSavings = () => import("./SavingsView");
const loadForms = () => import("./RecordForms");

function Loading() {
  return (
    <p className={vault.loading} aria-busy="true">
      Loading…
    </p>
  );
}

const AnalyticsView = dynamic(loadAnalytics, { loading: Loading });
const BillsView = dynamic(loadBills, { loading: Loading });
const BudgetsView = dynamic(loadBudgets, { loading: Loading });
const CalendarView = dynamic(loadCalendar, { loading: Loading });
const ExportView = dynamic(loadExport, { loading: Loading });
const SavingsView = dynamic(loadSavings, { loading: Loading });
const IncomeForm = dynamic(() => loadForms().then((m) => m.IncomeForm), { loading: Loading });
const ExpenseForm = dynamic(() => loadForms().then((m) => m.ExpenseForm), { loading: Loading });

const PRELOAD: Partial<Record<string, () => Promise<unknown>>> = {
  analytics: loadAnalytics,
  bills: loadBills,
  budgets: loadBudgets,
  calendar: loadCalendar,
  export: loadExport,
  savings: loadSavings,
};

type Tab = "dashboard" | "income" | "expenses" | "budgets" | "bills" | "calendar" | "analytics" | "savings" | "export";

const TABS: { id: Tab; label: string; href: string; icon: string[] }[] = [
  { id: "dashboard", label: "Dashboard", href: "#/", icon: ["M4 4h7v7H4z", "M13 4h7v4h-7z", "M13 10h7v10h-7z", "M4 13h7v7H4z"] },
  { id: "income", label: "Income", href: "#/income", icon: ["M12 19V5", "m5 12 7-7 7 7"] },
  { id: "expenses", label: "Expenses", href: "#/expenses", icon: ["M12 5v14", "m19 12-7 7-7-7"] },
  { id: "budgets", label: "Budgets", href: "#/budgets", icon: ["M21 12a9 9 0 1 1-9-9v9h9Z", "M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"] },
  { id: "bills", label: "Bills", href: "#/bills", icon: ["M6 3h12v18l-3-2-3 2-3-2-3 2V3Z", "M9 8h6", "M9 12h6"] },
  { id: "calendar", label: "Calendar", href: "#/calendar", icon: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4", "M16 3v4"] },
  { id: "analytics", label: "Analytics", href: "#/analytics", icon: ["M4 20h16", "M6 16V10", "M10 16V6", "M14 16v-4", "M18 16V8"] },
  { id: "savings", label: "Savings", href: "#/savings", icon: ["M19 7h-3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z", "M12 11v5", "M9.5 13.5h5"] },
  { id: "export", label: "Export", href: "#/export", icon: ["M12 4v11", "m7 10 5 5 5-5", "M5 20h14"] },
];

/** App shell for the Budget Vault: routes, month selection and actions. */
export default function BudgetVault() {
  const {
    data,
    storageWorks,
    addIncome,
    editIncome,
    deleteIncome,
    addExpense,
    editExpense,
    deleteExpense,
    addCategory,
    setBillPaid,
    setMonthBudgets,
    copyMonthBudgets,
    addAllocation,
    replaceAllocation,
    deleteAllocation,
  } = useBudget();
  const path = useHashPath();
  const [today] = useState(() => todayISO());
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [announcement, setAnnouncement] = useState("");
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const firstView = useRef(true);
  const routeKey = path.join("/");

  // On small screens the tabs scroll sideways; keep the current one visible (without scrolling the page).
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('nav[aria-label="Budget Vault sections"]');
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    const offset = current.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    nav.scrollTo({ left: offset - (nav.clientWidth - current.offsetWidth) / 2 });
  }, [path[0], data === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move focus to the new view's heading so keyboard and screen-reader users know the page changed.
  useEffect(() => {
    if (!data) return;
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    const focusHeading = (heading: HTMLElement) => {
      heading.focus({ preventScroll: true });
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      (heading.closest("section") ?? heading).scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    };
    const ready = document.querySelector<HTMLElement>("[data-view-heading]");
    if (ready) return focusHeading(ready);
    // A screen that's still downloading has no heading yet: wait for it (up to 10 seconds).
    const observer = new MutationObserver(() => {
      const heading = document.querySelector<HTMLElement>("[data-view-heading]");
      if (!heading) return;
      observer.disconnect();
      focusHeading(heading);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 10_000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [routeKey, data === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return (
      <p className={vault.loading} aria-busy="true">
        Opening your Budget Vault…
      </p>
    );
  }

  const go = (hash: string) => {
    window.location.hash = hash;
  };
  // Routes: #/ · #/income(/new|/:id) · #/expenses(/new|/:id) · #/budgets · #/bills(/new|/:id)
  const [view, id] = path;
  const tab: Tab = (["income", "expenses", "budgets", "bills", "calendar", "analytics", "savings", "export"] as const).find((t) => t === view) ?? "dashboard";

  const copyForward = (count: number) => {
    const { replaced } = copyBudgets(data.budgets, month, count);
    const done = () => {
      copyMonthBudgets(month, count);
      setAnnouncement(`Budgets copied into the next ${count === 1 ? "month" : `${count} months`}.`);
    };
    if (replaced.length === 0) return done();
    setConfirmRequest({
      title: "Replace existing budgets?",
      message: `${replaced.map(monthLabel).join(", ")} already ${replaced.length === 1 ? "has" : "have"} budgets. Copying will replace ${replaced.length === 1 ? "it" : "them"} with ${monthLabel(month)}’s limits.`,
      confirmLabel: "Replace and copy",
      onConfirm: done,
    });
  };

  const renderExpenseForm = (mode: "expense" | "bill") => {
    const back = mode === "bill" ? "#/bills" : "#/expenses";
    const record = id === "new" ? undefined : data.expenses.find((r) => r.id === id);
    if (id !== "new" && !record) return <NotFound href={back} label={mode === "bill" ? "Bills" : "Expenses"} />;
    return (
      <ExpenseForm
        key={`${mode}-${id}`}
        mode={mode}
        initial={record}
        today={today}
        custom={data.customCategories}
        onAddCategory={addCategory}
        onSubmit={(draft) => {
          if (record) editExpense(record.id, draft);
          else addExpense(draft);
          setAnnouncement(`${draft.description.trim()} saved.`);
          showIfHidden(draft);
          go(back);
        }}
      />
    );
  };

  /** After saving, jump to the record's month only if it wouldn't appear in the month being viewed. */
  const showIfHidden = (draft: { date: string; frequency: Frequency; endDate: string }) => {
    const { from, to } = monthRange(month);
    if (occurrences(draft.date, draft.frequency, draft.endDate, from, to).length === 0) setMonth(draft.date.slice(0, 7));
  };

  const confirmDelete = (kind: "income" | "expense", recordId: string) => {
    const record = kind === "income" ? data.incomes.find((r) => r.id === recordId) : data.expenses.find((r) => r.id === recordId);
    if (!record) return;
    const name = "name" in record ? record.name : record.description;
    const recurring = record.frequency !== "once";
    setConfirmRequest({
      title: `Delete “${name}”?`,
      message: recurring
        ? "This repeats, so deleting it removes it from every month, past and future. To stop it from now on instead, edit it and set a last payment date."
        : "This entry will be removed and your totals recalculated.",
      confirmLabel: "Delete",
      onConfirm: () => {
        if (kind === "income") deleteIncome(recordId);
        else deleteExpense(recordId);
        setAnnouncement(`${name} deleted.`);
        // The delete button has gone, so give keyboard users a sensible place to continue from.
        setTimeout(() => document.querySelector<HTMLElement>("[data-view-heading]")?.focus({ preventScroll: true }), 0);
      },
    });
  };

  let content: React.ReactNode;
  if (view === "income" && id) {
    const record = id === "new" ? undefined : data.incomes.find((r) => r.id === id);
    content =
      id !== "new" && !record ? (
        <NotFound href="#/income" label="Income" />
      ) : (
        <IncomeForm
          key={id}
          initial={record}
          today={today}
          onSubmit={(draft) => {
            if (record) editIncome(record.id, draft);
            else addIncome(draft);
            setAnnouncement(`${draft.name.trim()} saved.`);
            showIfHidden(draft);
            go("#/income");
          }}
        />
      );
  } else if (view === "expenses" && id) {
    content = renderExpenseForm("expense");
  } else if (view === "bills" && id) {
    content = renderExpenseForm("bill");
  } else if (view === "bills") {
    content = (
      <BillsView
        data={data}
        month={month}
        today={today}
        onMonthChange={setMonth}
        onSetPaid={(payment, paid) => {
          setBillPaid(payment.key, paid);
          setAnnouncement(`${payment.label}, ${formatDay(payment.date)}: ${paid ? "marked as paid" : "no longer marked as paid"}.`);
        }}
        onMarkAllPaid={(payments) => {
          payments.forEach((p) => setBillPaid(p.key, true));
          setAnnouncement(`${payments.length} payments marked as paid.`);
        }}
        onDelete={(recordId) => confirmDelete("expense", recordId)}
      />
    );
  } else if (view === "savings") {
    content = (
      <SavingsView
        data={data}
        month={month}
        today={today}
        onMonthChange={setMonth}
        onAdd={(goalId, goalName, amount) => addAllocation(month, goalId, goalName, amount)}
        onReplace={replaceAllocation}
        onDelete={deleteAllocation}
        onConfirm={setConfirmRequest}
        onAnnounce={setAnnouncement}
      />
    );
  } else if (view === "export") {
    content = <ExportView data={data} month={month} today={today} onMonthChange={setMonth} onAnnounce={setAnnouncement} />;
  } else if (view === "calendar") {
    content = <CalendarView data={data} month={month} today={today} onMonthChange={setMonth} />;
  } else if (view === "analytics") {
    content = <AnalyticsView data={data} month={month} today={today} onMonthChange={setMonth} />;
  } else if (view === "budgets") {
    content = (
      <BudgetsView
        key={month}
        data={data}
        month={month}
        today={today}
        onMonthChange={setMonth}
        onSave={(limits) => {
          setMonthBudgets(month, limits);
          setAnnouncement(`Budgets for ${monthLabel(month)} saved.`);
        }}
        onCopyForward={copyForward}
      />
    );
  } else if (view === "income" || view === "expenses") {
    content = (
      <EntryList
        key={view}
        mode={view}
        data={data}
        month={month}
        today={today}
        onMonthChange={setMonth}
        onDelete={(recordId) => confirmDelete(view === "income" ? "income" : "expense", recordId)}
      />
    );
  } else {
    content = <BudgetDashboard data={data} month={month} today={today} onMonthChange={setMonth} />;
  }

  return (
    <div className={vault.app}>
      {!storageWorks && (
        <p className={vault.storageWarning} role="alert">
          This browser isn&rsquo;t letting Dream Vault save. Your budget will disappear when you close the page.
        </p>
      )}
      <nav aria-label="Budget Vault sections" className={`${tabs.tabs} ${styles.vaultTabs}`}>
        {TABS.map((t) => (
          <a
            key={t.id}
            href={t.href}
            className={`${tabs.tab} ${t.id === tab ? tabs.tabActive : ""}`}
            aria-current={t.id === tab ? "page" : undefined}
            // Start downloading a screen as soon as someone heads for its tab.
            onPointerEnter={() => PRELOAD[t.id]?.()}
            onFocus={() => PRELOAD[t.id]?.()}
            onTouchStart={() => PRELOAD[t.id]?.()}
          >
            <Icon paths={t.icon} size={16} />
            {t.label}
          </a>
        ))}
      </nav>
      {content}
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function NotFound({ href, label }: { href: string; label: string }) {
  return (
    <div className={vault.emptyState}>
      <h2 tabIndex={-1} data-view-heading className={vault.emptyTitle}>
        We couldn&rsquo;t find that entry
      </h2>
      <p className={vault.emptyText}>It may have been deleted.</p>
      <a href={href} className={vault.buttonPrimary}>
        Back to {label}
      </a>
    </div>
  );
}
