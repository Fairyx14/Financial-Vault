/**
 * Site search: finds pages, vault screens and help topics. Everything runs in the browser
 * against the list below; nothing typed is sent anywhere. It searches what the site offers,
 * not anyone's saved vault data.
 *
 * Keep this list in step with the app: every href must lead somewhere real, and "Coming soon"
 * features must say so.
 */

export type SearchGroup = "Vaults" | "Savings Vault" | "Investment Vault" | "Budget Vault" | "Account" | "Help" | "Coming soon";

export interface SearchItem {
  title: string;
  description: string;
  href: string;
  group: SearchGroup;
  /** Other words people might type for this, in lower case. */
  keywords: string[];
}

export const SEARCH_INDEX: SearchItem[] = [
  // Vaults
  { title: "Savings Vault", description: "Plan savings goals and log deposits.", href: "/vault", group: "Vaults", keywords: ["savings", "goals", "save", "saving", "dream", "target"] },
  { title: "Investment Vault", description: "Track holdings, portfolio value and gains.", href: "/investments", group: "Vaults", keywords: ["investments", "invest", "portfolio", "stocks", "shares", "funds", "etf", "isa"] },
  { title: "Budget Vault", description: "Income, spending, budgets and bills.", href: "/budget", group: "Vaults", keywords: ["budget", "budgeting", "money", "spending", "income", "expenses", "cash flow"] },

  // Savings Vault
  { title: "Add a savings goal", description: "Set a target and see when you could reach it.", href: "/vault#/new", group: "Savings Vault", keywords: ["new goal", "goal", "house deposit", "emergency fund", "holiday", "wedding", "car", "target date"] },
  { title: "Your savings goals", description: "See progress and log deposits or withdrawals.", href: "/vault#/", group: "Savings Vault", keywords: ["deposit", "withdrawal", "progress", "on track", "behind", "balance"] },

  // Investment Vault
  { title: "Your portfolio", description: "Holdings, total value and gain or loss.", href: "/investments#/", group: "Investment Vault", keywords: ["holdings", "value", "profit", "loss", "gain", "performance", "allocation"] },
  { title: "Add an investment", description: "Record a fund, share or other holding.", href: "/investments#/new", group: "Investment Vault", keywords: ["new investment", "buy", "share", "fund", "etf", "crypto", "bond", "holding"] },
  { title: "Growth calculator", description: "Project how regular investing could grow.", href: "/investments#/calculator", group: "Investment Vault", keywords: ["compound interest", "projection", "calculator", "growth", "returns", "forecast"] },
  { title: "Investment goals", description: "Set goals and see projected progress.", href: "/investments#/goals", group: "Investment Vault", keywords: ["goal", "retirement", "target", "milestone"] },

  // Budget Vault
  { title: "Budget dashboard", description: "Income, spending and what's left this month.", href: "/budget#/", group: "Budget Vault", keywords: ["overview", "left over", "savings rate", "remaining", "this month", "summary"] },
  { title: "Income", description: "Salary and other money coming in.", href: "/budget#/income", group: "Budget Vault", keywords: ["salary", "wages", "pay", "earnings", "dividends", "freelance", "rental income"] },
  { title: "Add income", description: "Record a payment you received.", href: "/budget#/income/new", group: "Budget Vault", keywords: ["new income", "add salary", "payday"] },
  { title: "Expenses", description: "Spending, refunds and transfers, with search and filters.", href: "/budget#/expenses", group: "Budget Vault", keywords: ["spending", "transactions", "purchases", "refunds", "transfers", "filter"] },
  { title: "Add an expense", description: "Record something you spent, a refund or a transfer.", href: "/budget#/expenses/new", group: "Budget Vault", keywords: ["new expense", "spend", "purchase", "refund", "transfer", "credit card"] },
  { title: "Budgets", description: "Monthly spending limits for each category.", href: "/budget#/budgets", group: "Budget Vault", keywords: ["category budgets", "spending limit", "limits", "groceries", "over budget", "allowance"] },
  { title: "Bills & subscriptions", description: "Regular payments, yearly costs and what's due.", href: "/budget#/bills", group: "Budget Vault", keywords: ["bills", "subscriptions", "rent", "mortgage", "utilities", "energy", "phone", "internet", "broadband", "gym", "netflix", "streaming", "direct debit", "due"] },
  { title: "Add a bill or subscription", description: "Add a regular payment once.", href: "/budget#/bills/new", group: "Budget Vault", keywords: ["new bill", "new subscription", "recurring payment"] },
  { title: "Cash-flow calendar", description: "Money in and out, day by day.", href: "/budget#/calendar", group: "Budget Vault", keywords: ["calendar", "dates", "schedule", "upcoming", "due dates", "payday"] },
  { title: "Analytics", description: "Charts, trends and category comparisons.", href: "/budget#/analytics", group: "Budget Vault", keywords: ["charts", "graphs", "trends", "breakdown", "compare", "savings rate history", "reports"] },
  { title: "Plan savings from your budget", description: "Set money aside for a Savings Vault goal.", href: "/budget#/savings", group: "Budget Vault", keywords: ["allocate", "allocation", "move to savings", "set aside", "deposit"] },
  { title: "Export your data", description: "Download transactions, a summary or a backup.", href: "/budget#/export", group: "Budget Vault", keywords: ["download", "csv", "excel", "spreadsheet", "backup", "json", "export"] },

  // Account
  { title: "Your account", description: "Email, sign out and account settings.", href: "/account", group: "Account", keywords: ["profile", "settings", "sign out", "log out", "logout", "email"] },
  { title: "Change password", description: "Choose a new password for your account.", href: "/account", group: "Account", keywords: ["password", "new password", "security"] },
  { title: "Forgot your password?", description: "Get a reset link from the sign-in page.", href: "/vault", group: "Account", keywords: ["reset password", "forgotten", "can't sign in", "locked out", "login", "log in"] },
  { title: "Delete your account", description: "Permanently remove your account and data.", href: "/account", group: "Account", keywords: ["delete", "close account", "remove data", "erase"] },

  // Help
  { title: "How Dream Vault works", description: "Three steps to a clearer financial picture.", href: "/#how-it-works", group: "Help", keywords: ["getting started", "how to", "start", "guide", "help"] },
  { title: "Features", description: "Everything in Dream Vault, and what's coming.", href: "/#features", group: "Help", keywords: ["features", "what can it do", "tools", "modules"] },
  { title: "Privacy notice", description: "What's stored, where, and who can see it.", href: "/privacy", group: "Help", keywords: ["privacy", "data", "where is my data", "stored", "encryption", "supabase", "gdpr", "who can see", "security", "safe"] },
  { title: "Terms of use", description: "The rules for using Dream Vault.", href: "/terms", group: "Help", keywords: ["terms", "conditions", "rules", "legal", "disclaimer"] },
  { title: "Is my data secure?", description: "How your account and data are protected.", href: "/#privacy-overview", group: "Help", keywords: ["secure", "security", "protected", "safe", "bank connection", "encrypted"] },
  { title: "About Dream Vault", description: "Why Dream Vault exists.", href: "/#about", group: "Help", keywords: ["about", "who", "mission"] },

  // Coming soon (on the features list, not available yet)
  { title: "Wealth Vault (coming soon)", description: "Net worth tracking. Not available yet.", href: "/#features", group: "Coming soon", keywords: ["net worth", "wealth", "assets"] },
  { title: "Tax Vault (coming soon)", description: "Tax planning. Not available yet.", href: "/#features", group: "Coming soon", keywords: ["tax", "hmrc", "self assessment"] },
  { title: "Debt Freedom Vault (coming soon)", description: "Paying off debt. Not available yet.", href: "/#features", group: "Coming soon", keywords: ["debt", "loan", "credit card debt", "pay off"] },
  { title: "Side Hustle Hub (coming soon)", description: "Side income. Not available yet.", href: "/#features", group: "Coming soon", keywords: ["side hustle", "business", "extra income"] },
  { title: "Financial tools (coming soon)", description: "Mortgage, pension and other calculators. Not available yet.", href: "/#tools", group: "Coming soon", keywords: ["mortgage", "pension", "calculator", "tools", "loan calculator"] },
];

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9£%]+/g, " ")
    .trim();

/** Scores how well one search word matches an item. 0 means it doesn't match. */
function wordScore(word: string, item: SearchItem): number {
  const title = normalise(item.title);
  const titleWords = title.split(" ");
  if (titleWords.includes(word)) return 10;
  if (titleWords.some((w) => w.startsWith(word))) return 8;
  const keywords = item.keywords.map(normalise);
  if (keywords.some((k) => k === word || k.split(" ").includes(word))) return 6;
  if (keywords.some((k) => k.split(" ").some((w) => w.startsWith(word)))) return 4;
  const description = normalise(item.description).split(" ");
  if (description.some((w) => w.startsWith(word))) return 2;
  return 0;
}

/**
 * Best matches first. Every word typed must match somewhere (title, other words people use,
 * or description); titles count most. A whole phrase matching a keyword gets a bonus.
 */
export function searchSite(query: string, limit = 8, index: SearchItem[] = SEARCH_INDEX): SearchItem[] {
  const phrase = normalise(query);
  if (!phrase) return [];
  const words = phrase.split(" ").filter((w) => w.length > 0 && !["a", "an", "the", "my", "to", "of", "and", "how", "do", "i"].includes(w));
  if (words.length === 0) return [];
  return index
    .map((item, position) => {
      let score = 0;
      for (const word of words) {
        const s = wordScore(word, item);
        if (s === 0) return { item, score: 0, position };
        score += s;
      }
      if (normalise(item.title).includes(phrase) || item.keywords.some((k) => normalise(k).includes(phrase))) score += 5;
      if (item.group === "Coming soon") score -= 3; // real features first
      return { item, score, position };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, limit)
    .map((r) => r.item);
}

/** Shown before anything is typed. */
export const SUGGESTED = ["Budget Vault", "Add an expense", "Bills & subscriptions", "Add a savings goal", "Your portfolio", "Export your data"]
  .map((title) => SEARCH_INDEX.find((i) => i.title === title)!)
  .filter(Boolean);
