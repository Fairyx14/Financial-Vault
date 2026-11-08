import type { Metadata } from "next";
import DreamVault from "@/components/DreamVault";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Savings Vault",
  description:
    "Plan your savings goals, log deposits and see when each dream could come true. Your goals are saved in this browser only.",
};

/** The savings tracker. All app state lives in the browser; see components/DreamVault.tsx. */
export default function VaultPage() {
  return (
    <>
      <a href="#planner" className="skip-link">
        Skip to the planner
      </a>
      <SiteHeader current="vault" />

      <main id="planner" tabIndex={-1}>
        <section className="hero container" aria-labelledby="hero-title">
          <p className="hero__eyebrow">Savings Vault</p>
          <h1 id="hero-title" className="hero__title">
            Every dream has a date.
            <span className="hero__title-accent"> Find yours.</span>
          </h1>
          <p className="hero__lead">
            Plan as many dreams as you like, see when each one could come true, and log every deposit to watch
            the date get closer.
          </p>
        </section>

        <div className="container">
          <DreamVault />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
