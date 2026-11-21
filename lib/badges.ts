/** Badge definitions (brief → Progression + Landmark missions). Pure: evaluated from progress data. */
import { MISSIONS } from "./missions";
import type { Completion } from "./progress";

export type BadgeInput = { completions: Record<string, Completion>; pct: number };
export type BadgeStatus = { earned: boolean; have: number; need: number; lockedNote?: string };

export type Badge = {
  code: string;
  name: string;
  description: string;
  glyph: string; // 24×24 stroke path
  color: string;
  evaluate: (i: BadgeInput) => BadgeStatus;
};

const count = (i: BadgeInput, pred: (slug: string) => boolean) => Object.keys(i.completions).filter(pred).length;
const bySlug = (slug: string) => MISSIONS.find((m) => m.slug === slug);
const londonHour = (ms: number) =>
  Number(new Intl.DateTimeFormat("en-CA", { hour: "numeric", hour12: false, timeZone: "America/Toronto" }).format(ms));
const progress = (have: number, need: number): BadgeStatus => ({ earned: have >= need, have: Math.min(have, need), need });
const notYet = (system: string): BadgeStatus => ({ earned: false, have: 0, need: 1, lockedNote: `Unlocks when ${system} launch` });

export const BADGES: Badge[] = [
  {
    code: "first-job",
    name: "First Job",
    description: "Complete your first mission",
    glyph: "M5 12l4 4L19 6",
    color: "#FF8A3D",
    evaluate: (i) => progress(Object.keys(i.completions).length, 1),
  },
  {
    code: "goose-whisperer",
    name: "Goose Whisperer",
    description: "Photograph geese for 5 missions",
    glyph: "M7 20c0-4 2-6 6-6h3a3 3 0 0 0 0-6c-2 0-3 1-3 3v3M16 5l3-1M4 20h12",
    color: "#2EE6D6",
    evaluate: (i) => progress(count(i, (s) => s.includes("goose") && bySlug(s)?.type === "photo"), 5),
  },
  {
    code: "night-owl",
    name: "Night Owl",
    description: "Complete the Middlesex study-spot mission after midnight",
    glyph: "M6 4l3 3h6l3-3v9a6 6 0 0 1-12 0zM9.5 11.5h.01M14.5 11.5h.01",
    color: "#7B2FF7",
    evaluate: (i) => {
      const c = i.completions["middlesex-study-spot"];
      return progress(c && londonHour(c.at) < 5 ? 1 : 0, 1);
    },
  },
  {
    code: "location-scout",
    name: "Location Scout",
    description: "Complete 5 film & TV landmark missions",
    glyph: "M4 7h12v10H4zM16 10l4-2v8l-4-2",
    color: "#FF4F8B",
    evaluate: (i) => progress(count(i, (s) => bySlug(s)?.category === "film_tv"), 5),
  },
  {
    code: "historian",
    name: "Historian",
    description: "Complete 5 history landmark missions",
    glyph: "M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-6 9 6z",
    color: "#FFC857",
    evaluate: (i) => progress(count(i, (s) => bySlug(s)?.category === "history"), 5),
  },
  {
    code: "cartographer",
    name: "Cartographer",
    description: "Explore 25% of London",
    glyph: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
    color: "#2EE6D6",
    evaluate: (i) => ({ earned: i.pct >= 25, have: Math.min(Math.floor(i.pct * 10) / 10, 25), need: 25 }),
  },
  {
    code: "heister",
    name: "Heister",
    description: "Complete 3 heists",
    glyph: "M4 18h16M4 18 3 7l5 4 4-6 4 6 5-4-1 11",
    color: "#7B2FF7",
    evaluate: () => notYet("heists"),
  },
  {
    code: "route-6-regular",
    name: "Route 6 Regular",
    description: "Ride the same route on 10 different days",
    glyph: "M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2zM4 11h16M7 19v-3M17 19v-3",
    color: "#FF8A3D",
    evaluate: () => notYet("live buses"),
  },
  {
    code: "every-route",
    name: "Every Route",
    description: "Ride every LTC route",
    glyph: "M3 12h18M12 3v18M5 5l14 14M19 5 5 19",
    color: "#FF4F8B",
    evaluate: () => notYet("live buses"),
  },
];

export const badgeByCode = (code: string) => BADGES.find((b) => b.code === code);
