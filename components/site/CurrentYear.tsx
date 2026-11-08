"use client";

import { useEffect, useState } from "react";

/** The visitor's current year. Pages are pre-rendered, so the year is refreshed in the browser. */
export default function CurrentYear() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  useEffect(() => setYear(new Date().getFullYear()), []);
  return <span suppressHydrationWarning>{year}</span>;
}
