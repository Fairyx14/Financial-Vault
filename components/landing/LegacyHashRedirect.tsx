"use client";

import { useEffect } from "react";

/**
 * The savings tracker used to live at "/" with hash routes like "/#/goal/abc".
 * It now lives at "/vault", so forward any old bookmark there.
 */
export default function LegacyHashRedirect() {
  useEffect(() => {
    if (window.location.hash.startsWith("#/")) {
      window.location.replace(`/vault${window.location.hash}`);
    }
  }, []);
  return null;
}
