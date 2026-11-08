import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Dream Vault handles your information: savings goals are stored in your browser on your device.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="8 November 2026">
      <p>
        This page explains, in plain English, how Dream Vault handles information today. We&rsquo;ll update it whenever
        that changes.
      </p>

      <h2>What Dream Vault stores</h2>
      <p>
        When you use the <Link href="/vault">Savings Vault</Link> or the <Link href="/investments">Investment Vault</Link>,
        everything you enter (goals, deposits, investments, prices, exchange rates and notes) is saved in your
        browser&rsquo;s local storage on the device you&rsquo;re using. Your chosen currency and light or dark theme are saved
        there too. Investment prices are only ever the ones you type in; Dream Vault doesn&rsquo;t connect to any broker or
        market-data service.
      </p>

      <h2>What Dream Vault doesn&rsquo;t do</h2>
      <ul>
        <li>It doesn&rsquo;t send your savings data to a Dream Vault server.</li>
        <li>It doesn&rsquo;t ask you to create an account or give an email address.</li>
        <li>It doesn&rsquo;t connect to your bank or any other financial account.</li>
        <li>It doesn&rsquo;t use advertising trackers.</li>
      </ul>

      <h2>Things to be aware of</h2>
      <ul>
        <li>Your data stays in one browser on one device. It doesn&rsquo;t sync elsewhere and isn&rsquo;t backed up.</li>
        <li>Anyone who uses the same browser profile on your device can open your vault.</li>
        <li>Clearing your browser&rsquo;s site data, or closing a private window, deletes your vault.</li>
        <li>Like any website, the server that delivers these pages may keep standard technical logs of page requests.</li>
      </ul>

      <h2>Deleting your data</h2>
      <p>
        You can delete any goal, entry or investment inside the vaults. To remove everything at once, clear this site&rsquo;s
        data in your browser settings.
      </p>
    </LegalPage>
  );
}
