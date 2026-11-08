import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Dream Vault's financial tracking tools and illustrative calculations.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="8 November 2026">
      <p>By using Dream Vault you agree to the points below. They&rsquo;re a plain-English summary of how the service works.</p>

      <h2>Information, not advice</h2>
      <p>
        Dream Vault provides financial tracking tools and illustrative calculations for educational and informational
        purposes. It does not provide regulated financial, investment or tax advice. If you need advice for your
        circumstances, speak to a qualified professional.
      </p>

      <h2>Estimates can differ from reality</h2>
      <p>
        Projections assume steady contributions and constant growth based on the figures you enter. Real outcomes may
        differ, and investment values can go down as well as up.
      </p>

      <h2>Your data is your responsibility</h2>
      <p>
        Your vault is stored in your browser on your device. Dream Vault can&rsquo;t recover it if it&rsquo;s deleted, so
        keep your own records of anything important.
      </p>

      <h2>Features in development</h2>
      <p>
        Modules marked &ldquo;Coming soon&rdquo; aren&rsquo;t available yet. Their details may change before release.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms as Dream Vault grows. The date at the top shows when they last changed.</p>
    </LegalPage>
  );
}
