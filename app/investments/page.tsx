import type { Metadata } from "next";
import InvestmentVault from "@/components/investments/InvestmentVault";
import AppTabs from "@/components/site/AppTabs";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import styles from "@/components/investments/investments.module.css";

export const metadata: Metadata = {
  title: "Investment Vault",
  description:
    "Track your investments, see your portfolio value and gains, all from prices you enter. Stored in your browser only.",
};

export default function InvestmentsPage() {
  return (
    <>
      <a href="#app" className="skip-link">
        Skip to your investments
      </a>
      <SiteHeader />
      <AppTabs current="investments" />

      <main id="app" tabIndex={-1}>
        <section className="hero container" aria-labelledby="hero-title">
          <p className="hero__eyebrow">Investment Vault</p>
          <h1 id="hero-title" className="hero__title">
            See the bigger picture
            <span className="hero__title-accent"> of your investments.</span>
          </h1>
          <p className="hero__lead">
            Record what you hold and what you paid, update prices when you like, and watch your portfolio&rsquo;s value and
            performance in one place.
          </p>
        </section>

        <div className="container">
          <InvestmentVault />
          <p className={styles.disclaimer}>
            Investment Vault is a personal tracking and educational planning tool. Market values are manually entered
            unless otherwise stated. Investment returns are not guaranteed, and projections are illustrative rather than
            financial advice.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
