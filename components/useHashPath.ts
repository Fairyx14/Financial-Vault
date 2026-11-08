"use client";

import { useEffect, useState } from "react";

/**
 * The parts of a "#/a/b/c" URL hash, e.g. ["holding", "abc", "edit"].
 * In-page anchors that don't start with "#/" (such as skip links) are ignored.
 */
export function useHashPath(): string[] {
  const [path, setPath] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      const { hash } = window.location;
      if (hash && !hash.startsWith("#/")) return;
      setPath(hash.replace(/^#\/?/, "").split("/").filter(Boolean));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return path;
}
