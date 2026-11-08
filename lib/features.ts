/**
 * Dream Vault modules shown on the landing page.
 * Only modules with status "available" may link anywhere. Update a module's status
 * (and give it an href) only once it genuinely works in the app.
 */
export type FeatureStatus = "available" | "coming-soon";

export interface Feature {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Stroke paths on a 24×24 grid. */
  icon: string[];
  status: FeatureStatus;
  href?: string;
}

export const FEATURES: Feature[] = [
  {
    id: "savings",
    name: "Savings Vault",
    tagline: "Make your dreams measurable.",
    description:
      "Create savings goals for your dream home, next car, wedding, holiday or emergency fund. Track contributions, monitor milestones and explore estimated completion dates.",
    icon: ["M4 5h16v14H4z", "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z", "M12 9v.01", "M6 19v2", "M18 19v2"],
    status: "available",
    href: "/vault",
  },
  {
    id: "investment",
    name: "Investment Vault",
    tagline: "See the bigger picture of your investments.",
    description:
      "Track stocks, ETFs, funds and other assets. Record purchases, sales and dividends, chart your portfolio, and explore hypothetical growth with a compound calculator and investment goals.",
    icon: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
    status: "available",
    href: "/investments",
  },
  {
    id: "budget",
    name: "Budget Vault",
    tagline: "Give every pound a purpose.",
    description:
      "Track income and expenses, create monthly budgets, organise spending categories and understand where your money goes.",
    icon: ["M3 7a2 2 0 0 1 2-2h13v4", "M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2Z", "M16 14.5h.01"],
    status: "coming-soon",
  },
  {
    id: "wealth",
    name: "Wealth Vault",
    tagline: "Know your net worth.",
    description:
      "Bring together your assets and liabilities to understand your overall financial position and monitor how it changes over time.",
    icon: ["M12 3v9h9", "M21 12a9 9 0 1 1-9-9"],
    status: "coming-soon",
  },
  {
    id: "tax",
    name: "Tax Vault",
    tagline: "Take the guesswork out of tax planning.",
    description:
      "Explore estimated UK Income Tax and National Insurance for employment, self-employment and additional income streams.",
    icon: ["M6 3h12v18l-3-2-3 2-3-2-3 2V3Z", "M9 8h6", "M9 12h6", "M9 16h3"],
    status: "coming-soon",
  },
  {
    id: "debt",
    name: "Debt Freedom Vault",
    tagline: "Your path towards financial freedom.",
    description:
      "Track outstanding debts, compare repayment strategies and explore how additional payments could reduce interest costs.",
    icon: ["M7 11V7a5 5 0 0 1 9.6-2", "M5 11h14v10H5z", "M12 15v2"],
    status: "coming-soon",
  },
  {
    id: "side-hustle",
    name: "Side Hustle Hub",
    tagline: "Turn extra income into financial progress.",
    description:
      "Record freelance earnings, business expenses and side-hustle profits, and connect those figures to tax planning.",
    icon: ["M3 8h18v12H3z", "M8 8V5h8v3", "M3 13h18"],
    status: "coming-soon",
  },
  {
    id: "tools",
    name: "Financial Tools",
    tagline: "Make smarter plans with helpful calculators.",
    description:
      "Explore mortgage repayments, pension projections, compound interest, salary take-home pay, subscription costs and other financial scenarios.",
    icon: ["M6 3h12v18H6z", "M9 7h6", "M9 12h.01", "M12 12h.01", "M15 12h.01", "M9 16h.01", "M12 16h.01", "M15 16h.01"],
    status: "coming-soon",
  },
];

/** Calculators for the Financial Tools module. Only give one an href once it really works. */
export const PLANNED_TOOLS: { name: string; href?: string; where?: string }[] = [
  { name: "Mortgage repayments" },
  { name: "Pension projections" },
  { name: "Compound interest", href: "/investments#/calculator", where: "In the Investment Vault" },
  { name: "Salary take-home pay" },
  { name: "Subscription costs" },
];
