export type GoalId =
  | "home"
  | "car"
  | "travel"
  | "wedding"
  | "education"
  | "emergency"
  | "retirement"
  | "custom";

export interface Goal {
  id: GoalId;
  name: string;
  blurb: string;
  /** SVG path data drawn on a 24×24 grid with a stroke. */
  icon: string[];
}

export const GOALS: Goal[] = [
  {
    id: "home",
    name: "Dream home",
    blurb: "A deposit for your own front door",
    icon: ["M3 10.5 12 3l9 7.5", "M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"],
  },
  {
    id: "car",
    name: "Luxury car",
    blurb: "The keys to something special",
    icon: ["M3 16v-3l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v3H3Z", "M3 16v2.5h3V16", "M18 16v2.5h3V16", "M7 12.5h.01", "M17 12.5h.01"],
  },
  {
    id: "travel",
    name: "World travel",
    blurb: "First-class tickets and far-off views",
    icon: ["M21.5 2.5 10.5 13.5", "M21.5 2.5 14.5 21.5l-4-8-8-4 19-7Z"],
  },
  {
    id: "wedding",
    name: "Wedding",
    blurb: "The day you'll remember forever",
    icon: ["M12 20.5s-7.5-4.6-9.3-9.4A5 5 0 0 1 12 6.6a5 5 0 0 1 9.3 4.5C19.5 15.9 12 20.5 12 20.5Z"],
  },
  {
    id: "education",
    name: "Education",
    blurb: "An investment in what comes next",
    icon: ["M2 9.5 12 4.5l10 5-10 5-10-5Z", "M6 11.5v4.5c3.5 2.5 8.5 2.5 12 0v-4.5", "M22 9.5v5"],
  },
  {
    id: "emergency",
    name: "Safety net",
    blurb: "Calm, whatever life brings",
    icon: ["M12 3 20 6v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6l8-3Z", "m8.8 12 2.2 2.2 4.2-4.4"],
  },
  {
    id: "retirement",
    name: "Retirement",
    blurb: "Golden years, on your terms",
    icon: ["M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "M12 2.5v2", "M12 19.5v2", "M2.5 12h2", "M19.5 12h2", "m5.3 5.3 1.4 1.4", "m17.3 17.3 1.4 1.4", "m5.3 18.7 1.4-1.4", "m17.3 6.7 1.4-1.4"],
  },
  {
    id: "custom",
    name: "Something else",
    blurb: "Name your own dream",
    icon: ["M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"],
  },
];

export function getGoal(id: GoalId): Goal {
  return GOALS.find((goal) => goal.id === id) ?? GOALS[0];
}
