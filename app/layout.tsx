import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/site/theme";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const DESCRIPTION =
  "Dream Vault is a personal finance planner. Set savings goals, log deposits and see when each dream could come true, with budgeting, investment and net-worth tools on the way.";

export const metadata: Metadata = {
  title: {
    default: "Dream Vault: every dream has a date",
    template: "%s · Dream Vault",
  },
  description: DESCRIPTION,
  applicationName: "Dream Vault",
  keywords: ["savings goals", "savings planner", "personal finance", "budgeting", "net worth", "financial planning", "UK"],
  openGraph: {
    type: "website",
    siteName: "Dream Vault",
    title: "Dream Vault: every dream has a date",
    description: DESCRIPTION,
    locale: "en_GB",
  },
  twitter: {
    card: "summary",
    title: "Dream Vault: every dream has a date",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the theme script may set data-theme before React loads.
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
