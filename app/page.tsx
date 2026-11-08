import Benefits from "@/components/landing/Benefits";
import DashboardPreview from "@/components/landing/DashboardPreview";
import FeatureGrid from "@/components/landing/FeatureGrid";
import FinalCta from "@/components/landing/FinalCta";
import Hero from "@/components/landing/Hero";
import LegacyHashRedirect from "@/components/landing/LegacyHashRedirect";
import Privacy from "@/components/landing/Privacy";
import Simulator from "@/components/landing/Simulator";
import Steps from "@/components/landing/Steps";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

/** Marketing homepage. The savings tracker itself lives at /vault. */
export default function Home() {
  return (
    <>
      <LegacyHashRedirect />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader current="home" />
      <main id="main" tabIndex={-1}>
        <Hero />
        <FeatureGrid />
        <Steps />
        <DashboardPreview />
        <Simulator />
        <Benefits />
        <Privacy />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
