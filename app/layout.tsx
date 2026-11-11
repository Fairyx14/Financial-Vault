import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani, Share_Tech_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/site/theme";
import "./globals.css";

/* Flight-deck type: Orbitron for headings and big numbers, Rajdhani for reading text,
   Share Tech Mono for small labels. Next.js self-hosts these, so no requests go to Google. */
const display = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const mono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
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
    { media: "(prefers-color-scheme: light)", color: "#eef3f6" },
    { media: "(prefers-color-scheme: dark)", color: "#05070a" },
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
