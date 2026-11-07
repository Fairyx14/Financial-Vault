"use client";

import { useEffect, useState } from "react";

export type Route =
  | { view: "dashboard" }
  | { view: "new" }
  | { view: "goal"; id: string }
  | { view: "edit"; id: string };

/** Routes live in the URL hash (#/goal/abc) so the browser's Back button works without a server. */
function parseHash(hash: string): Route {
  const [first, id, action] = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (first === "new") return { view: "new" };
  if (first === "goal" && id) return action === "edit" ? { view: "edit", id } : { view: "goal", id };
  return { view: "dashboard" };
}

export const routeKey = (route: Route) => ("id" in route ? `${route.view}:${route.id}` : route.view);

export function useHashRoute(): [Route, (hash: string) => void] {
  const [route, setRoute] = useState<Route>({ view: "dashboard" });

  useEffect(() => {
    const sync = () => {
      const { hash } = window.location;
      // In-page anchors such as the skip link (#planner) are not routes.
      if (hash && !hash.startsWith("#/")) return;
      setRoute(parseHash(hash));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const navigate = (hash: string) => {
    window.location.hash = hash;
  };

  return [route, navigate];
}
