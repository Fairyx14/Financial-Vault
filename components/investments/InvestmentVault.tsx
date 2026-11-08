"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import {
  draftFromInvestment,
  removeTransaction,
  summarizePortfolio,
  TRANSACTION_LABELS,
  type TransactionType,
} from "@/lib/investments";
import { formatDay } from "@/lib/vault";
import TransactionForm from "./TransactionForm";
import ConfirmDialog, { type ConfirmRequest } from "../ConfirmDialog";
import { useHashPath } from "../useHashPath";
import HoldingDetail from "./HoldingDetail";
import Holdings from "./Holdings";
import InvestmentForm from "./InvestmentForm";
import PortfolioOverview from "./PortfolioOverview";
import { useInvestments } from "./useInvestments";
import vault from "../Vault.module.css";

const TRANSACTION_TYPES = Object.keys(TRANSACTION_LABELS) as TransactionType[];

/** App shell for the Investment Vault: picks the view from the URL hash and wires up actions. */
export default function InvestmentVault() {
  const { investments, storageWorks, add, editDetails, remove, updatePrice, saveTransaction, deleteTransaction } =
    useInvestments();
  const path = useHashPath();
  const [announcement, setAnnouncement] = useState("");
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const firstView = useRef(true);
  const routeKey = path.join("/");

  const portfolio = useMemo(() => (investments ? summarizePortfolio(investments) : null), [investments]);

  // Move focus to the new view's heading so keyboard and screen-reader users know the page changed.
  useEffect(() => {
    if (!investments) return;
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    const heading = document.querySelector<HTMLElement>("[data-view-heading]");
    if (!heading) return;
    heading.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (heading.closest("section") ?? heading).scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }, [routeKey, investments === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!investments || !portfolio) {
    return (
      <p className={vault.loading} aria-busy="true">
        Opening your Investment Vault…
      </p>
    );
  }

  const go = (hash: string) => {
    window.location.hash = hash;
  };
  // Routes: #/ · #/new · #/holding/:id · #/holding/:id/edit · #/holding/:id/add/:type · #/holding/:id/tx/:txId
  const [view, id, action, param] = path;
  const holding = view === "holding" ? portfolio.holdings.find((h) => h.investment.id === id) : undefined;
  const editingTx = holding && action === "tx" ? holding.investment.transactions.find((t) => t.id === param) : undefined;
  const addType = action === "add" && TRANSACTION_TYPES.includes(param as TransactionType) ? (param as TransactionType) : null;
  let content: React.ReactNode;

  if (view === "new") {
    content = (
      <InvestmentForm
        key="new"
        mode="create"
        cancelHref="#/"
        onSubmit={(draft) => {
          const newId = add(draft);
          setAnnouncement(`${draft.name.trim()} added.`);
          go(`#/holding/${newId}`);
        }}
      />
    );
  } else if (view === "holding" && !holding) {
    content = (
      <div className={vault.emptyState}>
        <h2 tabIndex={-1} data-view-heading className={vault.emptyTitle}>
          We couldn&rsquo;t find that investment
        </h2>
        <p className={vault.emptyText}>It may have been deleted.</p>
        <a href="#/" className={vault.buttonPrimary}>
          Back to your investments
        </a>
      </div>
    );
  } else if (holding && action === "edit") {
    content = (
      <InvestmentForm
        key={`edit-${holding.investment.id}`}
        mode="edit"
        initial={draftFromInvestment(holding.investment)}
        cancelHref={`#/holding/${holding.investment.id}`}
        onSubmit={(draft) => {
          editDetails(holding.investment.id, draft);
          setAnnouncement("Changes saved.");
          go(`#/holding/${holding.investment.id}`);
        }}
      />
    );
  } else if (holding && (addType || editingTx)) {
    const back = `#/holding/${holding.investment.id}`;
    content = (
      <TransactionForm
        key={editingTx ? `tx-${editingTx.id}` : `add-${addType}`}
        investment={holding.investment}
        editing={editingTx}
        initialType={editingTx?.type ?? addType!}
        cancelHref={back}
        onSubmit={(draft) => {
          saveTransaction(holding.investment.id, draft, editingTx?.id);
          setAnnouncement(`${TRANSACTION_LABELS[draft.type]} saved.`);
          go(back);
        }}
      />
    );
  } else if (holding && action === "tx") {
    content = (
      <div className={vault.emptyState}>
        <h2 tabIndex={-1} data-view-heading className={vault.emptyTitle}>
          We couldn&rsquo;t find that entry
        </h2>
        <p className={vault.emptyText}>It may have been deleted.</p>
        <a href={`#/holding/${holding.investment.id}`} className={vault.buttonPrimary}>
          Back to {holding.investment.name}
        </a>
      </div>
    );
  } else if (holding) {
    content = (
      <HoldingDetail
        holding={holding}
        onUpdatePrice={(update) => {
          updatePrice(holding.investment.id, update);
          setAnnouncement("Price saved.");
        }}
        onDeleteTransaction={(transaction) => {
          const label = TRANSACTION_LABELS[transaction.type].toLowerCase();
          // Check first, so we explain the problem instead of asking "are you sure?".
          const problem = removeTransaction(holding.investment, transaction.id).error;
          if (problem) {
            setConfirmRequest({ title: "This can't be deleted yet", message: problem });
            return;
          }
          setConfirmRequest({
            title: `Delete this ${label}?`,
            message: `The ${label} on ${formatDay(transaction.date)} will be removed and every figure recalculated.`,
            confirmLabel: `Delete ${label}`,
            onConfirm: () => {
              deleteTransaction(holding.investment, transaction.id);
              setAnnouncement(`${TRANSACTION_LABELS[transaction.type]} deleted.`);
            },
          });
        }}
        onDelete={() =>
          setConfirmRequest({
            title: `Delete “${holding.investment.name}”?`,
            message: "This investment and its full history will be permanently removed. This can't be undone.",
            confirmLabel: "Delete investment",
            onConfirm: () => {
              remove(holding.investment.id);
              setAnnouncement(`${holding.investment.name} deleted.`);
              go("#/");
            },
          })
        }
      />
    );
  } else {
    content = (
      <section aria-labelledby="view-title">
        <div className={vault.toolbar}>
          <div>
            <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
              Your portfolio
            </h2>
            <p className={vault.viewSubtitle}>All values in GBP, calculated from the records you&rsquo;ve entered.</p>
          </div>
          <a href="#/new" className={vault.buttonPrimary}>
            <Icon paths={["M12 5v14", "M5 12h14"]} size={18} />
            Add investment
          </a>
        </div>

        {investments.length === 0 ? (
          <div className={vault.emptyState}>
            <span className={vault.emptyIcon}>
              <Icon paths={["M3 17l6-6 4 4 8-8", "M15 7h6v6"]} size={28} />
            </span>
            <h3 className={vault.emptyTitle}>Start tracking your investments</h3>
            <p className={vault.emptyText}>
              Add a holding with its purchase price and today&rsquo;s price. Dream Vault will work out what it&rsquo;s worth and
              how it&rsquo;s performing.
            </p>
            <a href="#/new" className={vault.buttonPrimary}>
              Add your first investment
            </a>
          </div>
        ) : (
          <>
            <PortfolioOverview portfolio={portfolio} />
            <Holdings holdings={portfolio.holdings} />
          </>
        )}
      </section>
    );
  }

  return (
    <div className={vault.app}>
      {!storageWorks && (
        <p className={vault.storageWarning} role="alert">
          This browser isn&rsquo;t letting Dream Vault save. Your investments will disappear when you close the page.
        </p>
      )}
      {content}
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
