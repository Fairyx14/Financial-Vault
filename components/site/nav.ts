/** Landing-page sections. Absolute ("/#…") so they also work from /vault and other pages. */
export const SECTION_LINKS = [
  { label: "Home", href: "/#top" },
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Financial Tools", href: "/#tools" },
  { label: "About", href: "/#about" },
] as const;

export const VAULT_HREF = "/vault";
