import type { Metadata } from "next";
import BudgetVault from "@/components/budget/BudgetVault";
import AppTabs from "@/components/site/AppTabs";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Budget Vault",
  description:
    "Track income and expenses, set category budgets and manage bills and subscriptions. Stored in your browser only.",
};

export default function BudgetPage() {
  return (
    <>
      <a href="#app" className="skip-link">
        Skip to your budget
      </a>
      <SiteHeader />
      <AppTabs current="budget" />

      <main id="app" tabIndex={-1}>
        <section className="hero container" aria-labelledby="hero-title">
          <p className="hero__eyebrow">Budget Vault</p>
          <h1 id="hero-title" className="hero__title">
            Give every pound
            <span className="hero__title-accent"> a purpose.</span>
          </h1>
          <p className="hero__lead">
            Record what comes in and goes out, set limits for each category and keep track of bills and subscriptions.
          </p>
        </section>

        <div className="container">
          <BudgetVault />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
