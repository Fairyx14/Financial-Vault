import type { Metadata } from "next";
import AdminArea from "@/components/admin/AdminArea";
import RequireAccount from "@/components/auth/RequireAccount";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

/* Not linked from any menu, and kept out of search engines. Access is enforced by the database. */
export const metadata: Metadata = {
  title: { absolute: "Dream Vault" },
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <a href="#admin" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="admin" tabIndex={-1}>
        <div className="container">
          <RequireAccount>
            <AdminArea />
          </RequireAccount>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
