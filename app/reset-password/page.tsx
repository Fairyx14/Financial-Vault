import type { Metadata } from "next";
import ResetPassword from "@/components/auth/ResetPassword";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main id="reset" tabIndex={-1}>
        <section className="hero container" aria-labelledby="hero-title">
          <p className="hero__eyebrow">Account</p>
          <h1 id="hero-title" className="hero__title">
            Reset your password.
          </h1>
        </section>
        <div className="container">
          <ResetPassword />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
