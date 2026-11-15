"use client";

import { useMemo } from "react";
import Icon from "@/components/Icon";
import { Decimal } from "@/lib/decimal";
import {
  billPaymentsBetween,
  billsOverview,
  billTypeOf,
  frequencyLabel,
  monthRange,
  unconfirmedBills,
  type BillPayment,
  type BillStatus,
  type BillSummary,
  type BudgetData,
} from "@/lib/budget";
import { formatDay } from "@/lib/vault";
import { money } from "../investments/format";
import MonthPicker, { monthLabel } from "./MonthPicker";
import vault from "../Vault.module.css";
import inv from "../investments/investments.module.css";
import styles from "./budget.module.css";

interface BillsViewProps {
  data: BudgetData;
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
  onSetPaid: (payment: BillPayment, paid: boolean) => void;
  onMarkAllPaid: (payments: BillPayment[]) => void;
  onDelete: (recordId: string) => void;
}

const STATUS_LABEL: Record<BillStatus, string> = {
  paid: "Paid",
  "due-today": "Due today",
  upcoming: "Upcoming",
  unconfirmed: "Not marked paid",
};

const PLUS = ["M12 5v14", "M5 12h14"];

export default function BillsView({ data, month, today, onMonthChange, onSetPaid, onMarkAllPaid, onDelete }: BillsViewProps) {
  const overview = useMemo(() => billsOverview(data, today), [data, today]);
  const payments = useMemo(() => {
    const { from, to } = monthRange(month);
    return billPaymentsBetween(data, from, to, today);
  }, [data, month, today]);
  const unconfirmed = useMemo(() => unconfirmedBills(data, today), [data, today]);
  const monthTotal = Decimal.sum(payments.map((p) => p.amount));
  const bills = overview.bills.filter((b) => b.group === "bill");
  const subscriptions = overview.bills.filter((b) => b.group === "subscription");

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            Bills &amp; subscriptions
          </h2>
          <p className={vault.viewSubtitle}>Regular payments, what they cost a year and what&rsquo;s due next.</p>
        </div>
        <div className={styles.toolbarRight}>
          <MonthPicker month={month} onChange={onMonthChange} />
          <a href="#/bills/new" className={vault.buttonPrimary}>
            <Icon paths={PLUS} size={16} />
            Add bill
          </a>
        </div>
      </div>

      {overview.bills.length === 0 ? (
        <div className={vault.emptyState}>
          <span className={vault.emptyIcon}>
            <Icon paths={["M6 3h12v18l-3-2-3 2-3-2-3 2V3Z", "M9 8h6", "M9 12h6"]} size={28} />
          </span>
          <h3 className={vault.emptyTitle}>No bills or subscriptions yet</h3>
          <p className={vault.emptyText}>
            Add rent, energy, insurance, your phone, broadband, the gym or streaming services. Already added one as a
            recurring expense? Edit it and choose a bill type, so it isn&rsquo;t entered twice.
          </p>
          <div className={styles.emptyActions}>
            <a href="#/bills/new" className={vault.buttonPrimary}>
              Add a bill or subscription
            </a>
          </div>
        </div>
      ) : (
        <>
          <dl className={`${inv.tiles} ${styles.tiles4}`}>
            <div className={inv.tile}>
              <dt>Per year</dt>
              <dd>{money(overview.annualTotal)}</dd>
              <dd className={inv.tileNote}>All active bills and subscriptions</dd>
            </div>
            <div className={inv.tile}>
              <dt>Average month</dt>
              <dd>{money(overview.monthlyAverage)}</dd>
              <dd className={inv.tileNote}>Yearly cost ÷ 12</dd>
            </div>
            <div className={inv.tile}>
              <dt>Bills</dt>
              <dd>{money(overview.annualBills)}</dd>
              <dd className={inv.tileNote}>A year</dd>
            </div>
            <div className={inv.tile}>
              <dt>Subscriptions</dt>
              <dd>{money(overview.annualSubscriptions)}</dd>
              <dd className={inv.tileNote}>A year</dd>
            </div>
          </dl>

          {unconfirmed.length > 0 && (
            <section className={`${vault.card} ${styles.attention}`} aria-labelledby="confirm-title">
              <h3 id="confirm-title" className={vault.cardTitle}>
                <Icon paths={["M12 8v5", "M12 16.5h.01", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"]} size={20} />
                {unconfirmed.length === 1 ? "1 past payment to confirm" : `${unconfirmed.length} past payments to confirm`}
              </h3>
              <p className={vault.muted}>
                These dates have passed (last 60 days). They already count as spending; marking them paid just confirms they
                went out.
              </p>
              <PaymentList
                listId="confirm-list"
                payments={unconfirmed}
                onSetPaid={(payment, paid) => {
                  // The row leaves this list once paid, so keep keyboard focus nearby.
                  const index = unconfirmed.indexOf(payment);
                  onSetPaid(payment, paid);
                  setTimeout(() => {
                    const buttons = document.querySelectorAll<HTMLElement>("#confirm-list button");
                    (buttons[Math.min(index, buttons.length - 1)] ?? document.getElementById("month-bills-title"))?.focus();
                  }, 0);
                }}
              />
              {unconfirmed.length > 1 && (
                <button
                  type="button"
                  className={`${vault.buttonSecondary} ${styles.markAll}`}
                  onClick={() => {
                    onMarkAllPaid(unconfirmed);
                    setTimeout(() => document.getElementById("month-bills-title")?.focus(), 0);
                  }}
                >
                  Mark all {unconfirmed.length} as paid
                </button>
              )}
            </section>
          )}

          <section className={vault.card} aria-labelledby="month-bills-title">
            <div className={vault.cardHead}>
              <h3 id="month-bills-title" tabIndex={-1} className={vault.cardTitle}>
                Due in {monthLabel(month)}
              </h3>
              <span className={styles.cardTotal}>{money(monthTotal)}</span>
            </div>
            {payments.length === 0 ? (
              <p className={vault.muted}>Nothing due in {monthLabel(month)}.</p>
            ) : (
              <PaymentList payments={payments} onSetPaid={onSetPaid} />
            )}
          </section>

          <div className={styles.dashGrid}>
            <BillGroupCard id="bills-title" title="Bills" items={bills} onDelete={onDelete} empty="No bills yet." />
            <BillGroupCard id="subs-title" title="Subscriptions" items={subscriptions} onDelete={onDelete} empty="No subscriptions yet." />
          </div>
        </>
      )}

      <p className={styles.helpNote}>
        <strong>No reminders are sent.</strong> Dream Vault doesn&rsquo;t send notifications, emails or texts. Check this
        page to see what&rsquo;s due. Marking a payment as paid is for your own records and doesn&rsquo;t change your
        totals. Each bill is stored once, so it&rsquo;s never counted twice in your spending.
      </p>
    </section>
  );
}

function PaymentList({
  payments,
  onSetPaid,
  listId,
}: {
  payments: BillPayment[];
  onSetPaid: BillsViewProps["onSetPaid"];
  listId?: string;
}) {
  return (
    <ul id={listId} className={styles.billPayments}>
      {payments.map((p) => {
        const paid = p.status === "paid";
        return (
          <li key={p.key}>
            <span className={styles.upcomingDate}>{formatDay(p.date)}</span>
            <span className={styles.upcomingName}>
              {p.label}
              <span className={styles.upcomingCat}>{billTypeOf(p.billType)?.label}</span>
            </span>
            <span className={styles.upcomingAmount}>{money(p.amount)}</span>
            <span className={`${styles.statusChip} ${styles[`bill_${p.status}`]}`}>{STATUS_LABEL[p.status]}</span>
            {p.status === "upcoming" ? (
              <span className={styles.billAction} aria-hidden="true" />
            ) : (
              <button
                type="button"
                className={`${paid ? vault.buttonGhost : vault.buttonSecondary} ${styles.billAction}`}
                aria-label={`${p.label}, ${formatDay(p.date)}: ${paid ? "paid. Press to undo" : "mark as paid"}`}
                onClick={() => onSetPaid(p, !paid)}
              >
                {paid ? "Undo" : "Mark paid"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function BillGroupCard({
  id,
  title,
  items,
  empty,
  onDelete,
}: {
  id: string;
  title: string;
  items: BillSummary[];
  empty: string;
  onDelete: (recordId: string) => void;
}) {
  return (
    <section className={vault.card} aria-labelledby={id}>
      <h3 id={id} className={vault.cardTitle}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className={vault.muted}>{empty}</p>
      ) : (
        <ul className={styles.billList}>
          {items.map((b) => (
            <li key={b.record.id} className={b.nextDue ? undefined : styles.billEnded}>
              <div className={styles.billMain}>
                <span className={styles.entryLabel}>{b.record.description}</span>
                <span className={styles.entryMeta}>
                  {billTypeOf(b.record.billType)?.label}
                  <span className={styles.badge}>{frequencyLabel(b.record.frequency)}</span>
                </span>
                <span className={styles.billNext}>{b.nextDue ? `Next due ${formatDay(b.nextDue)}` : "Ended"}</span>
              </div>
              <div className={styles.billCost}>
                <strong>{money(Decimal.of(b.record.amount))}</strong>
                <span>{money(b.annual)} a year</span>
              </div>
              <span className={styles.entryActions}>
                <a href={`#/bills/${b.record.id}`} className={vault.iconButton} aria-label={`Edit ${b.record.description}`} title="Edit">
                  <Icon paths={["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"]} size={16} />
                </a>
                <button
                  type="button"
                  className={vault.iconButton}
                  onClick={() => onDelete(b.record.id)}
                  aria-label={`Delete ${b.record.description}`}
                  title="Delete"
                >
                  <Icon paths={["M4 7h16", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} size={16} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
