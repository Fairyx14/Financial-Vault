import type { Metadata, Viewport } from "next";
import { Righteous, Space_Grotesk, Space_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/site/theme";
import "./globals.css";

/* Neo-Memphis arcade type: Righteous for headings and big numbers, Space Grotesk for
   reading text, Space Mono for small labels. Next.js self-hosts these, so no requests go to Google. */
const display = Righteous({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf3e0" },
    { media: "(prefers-color-scheme: dark)", color: "#120c24" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the theme script may set data-theme before React loads.
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
