import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Dream Vault handles your information: your vaults are saved to your account so they sync between devices.",
};

/*
 * Every statement here must match how the app actually works (components/auth, supabase/migrations).
 * When the Supabase project's region is confirmed, say where the data is held under "Where it's kept".
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="22 November 2026">
      <p>
        This page explains, in plain English, how Dream Vault handles information today. We&rsquo;ll update it whenever
        that changes.
      </p>

      <h2>Your account</h2>
      <p>
        To use the <Link href="/vault">Savings Vault</Link>, <Link href="/investments">Investment Vault</Link> or{" "}
        <Link href="/budget">Budget Vault</Link> you create an account with your email address and a password. Your email
        is used to sign you in and to send account emails, such as confirming your address or resetting your password.
        Dream Vault doesn&rsquo;t send marketing emails.
      </p>

      <h2>What Dream Vault stores</h2>
      <p>
        Everything you enter in the vaults (goals, deposits, investments, prices, exchange rates, income, expenses,
        categories, budgets, bill payments and notes) is saved to your account, so it&rsquo;s available on every device
        where you sign in. Investment prices are only ever the ones you type in; Dream Vault doesn&rsquo;t connect to any
        broker or market-data service.
      </p>

      <h2>Where it&rsquo;s kept</h2>
      <ul>
        <li>
          Accounts and vault data are held by <strong>Supabase</strong>, the database and sign-in service Dream Vault uses.
          Passwords are handled by Supabase&rsquo;s sign-in service; Dream Vault never sees or stores your password itself.
        </li>
        <li>Data travels between your device and Supabase over an encrypted (HTTPS) connection.</li>
        <li>
          The database only lets a signed-in account read or change its own data. Other users can&rsquo;t see your vaults.
        </li>
        <li>
          Your data isn&rsquo;t end-to-end encrypted. That means the people who run Dream Vault, and Supabase as the hosting
          provider, could technically access it.
        </li>
        <li>
          While you&rsquo;re signed in, a working copy is kept in your browser&rsquo;s storage so the vaults stay quick and keep
          working through short connection drops. Signing out removes it from that browser. Your light or dark theme
          choice is also saved in the browser.
        </li>
      </ul>

      <h2>What Dream Vault&rsquo;s administrators can see</h2>
      <p>
        Dream Vault has an admin area for running the service. It shows each account&rsquo;s email address, when it was
        created, when it last signed in, whether the email is confirmed, and which vaults have something saved in them.
        It also shows overall totals, such as how many accounts there are. It doesn&rsquo;t show what you&rsquo;ve entered
        in your vaults. Administrators can suspend or delete accounts, for example in response to misuse, and every such
        action is recorded.
      </p>

      <h2>What Dream Vault doesn&rsquo;t do</h2>
      <ul>
        <li>It doesn&rsquo;t connect to your bank or any other financial account.</li>
        <li>It doesn&rsquo;t sell your data or share it with advertisers.</li>
        <li>It doesn&rsquo;t use advertising trackers.</li>
      </ul>

      <h2>Things to be aware of</h2>
      <ul>
        <li>Anyone who knows your email and password can open your vaults, so use a password you don&rsquo;t use elsewhere.</li>
        <li>Sign out when you finish on a shared or public computer.</li>
        <li>
          You can download your Budget Vault as CSV or JSON files from its Export tab. These files are created in your
          browser and saved to your device. Once saved, keeping them safe is up to you.
        </li>
        <li>Like any website, the services that deliver these pages may keep standard technical logs of requests.</li>
      </ul>

      <h2>Deleting your data</h2>
      <p>
        You can delete any goal, entry or investment inside the vaults. To delete everything, go to{" "}
        <Link href="/account">your account</Link> and choose &ldquo;Delete my account&rdquo;. This permanently removes your
        account and all the data saved in it.
      </p>
    </LegalPage>
  );
}
