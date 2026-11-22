import type { Metadata } from "next";
import AccountSettings from "@/components/auth/AccountSettings";
import RequireAccount from "@/components/auth/RequireAccount";
import AppTabs from "@/components/site/AppTabs";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Your account",
  description: "Manage your Dream Vault account: change your password, sign out or delete your account.",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <>
      <a href="#account" className="skip-link">
        Skip to your account
      </a>
      <SiteHeader />
      <AppTabs />

      <main id="account" tabIndex={-1}>
        <section className="hero container" aria-labelledby="hero-title">
          <p className="hero__eyebrow">Account</p>
          <h1 id="hero-title" className="hero__title">
            Your account.
          </h1>
        </section>

        <div className="container">
          <RequireAccount>
            <AccountSettings />
          </RequireAccount>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
