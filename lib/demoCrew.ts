/**
 * Demo crew: clearly labelled sample players shown only when real friends are unavailable
 * (signed out, or accounts not configured), so the comparison UI can be demoed. Never mixed with real friends.
 */
import { cellsAround } from "./fog";
import { densify, type LngLat } from "./geo";
import type { FriendRow } from "@/app/api/friends/route";

type Demo = FriendRow & { path: LngLat[] };

const DEMO: Demo[] = [
  {
    handle: "demo.maya",
    name: "Maya (demo)",
    faculty: "Science",
    year: "2nd year",
    emblem: "owl",
    accent: "#2EE6D6",
    rep: 1840,
    cells: 0,
    missions: 6,
    // campus → Richmond Row → downtown
    path: [[-81.2737, 43.0096], [-81.2655, 43.0055], [-81.2565, 42.9995], [-81.251, 42.9935], [-81.2485, 42.986]],
  },
  {
    handle: "demo.dev",
    name: "Dev (demo)",
    faculty: "Engineering",
    year: "1st year",
    emblem: "bolt",
    accent: "#FF8A3D",
    rep: 620,
    cells: 0,
    missions: 3,
    // engineering buildings → Masonville
    path: [[-81.2765, 43.0105], [-81.2765, 43.0175], [-81.2745, 43.0265], [-81.2735, 43.0255]],
  },
  {
    handle: "demo.jules",
    name: "Jules (demo)",
    faculty: "Social Science",
    year: "3rd year",
    emblem: "goose",
    accent: "#7B2FF7",
    rep: 5320,
    cells: 0,
    missions: 11,
    // Old East Village loop
    path: [[-81.2335, 42.9905], [-81.2255, 42.9895], [-81.2195, 42.9885], [-81.2215, 42.9845], [-81.2315, 42.9855]],
  },
];

const cache = new Map<string, string[]>();

export function demoCells(handle: string) {
  if (!cache.has(handle)) {
    const d = DEMO.find((x) => x.handle === handle);
    const set = new Set<string>();
    for (const [lng, lat] of densify(d?.path ?? [], 60)) for (const c of cellsAround(lat, lng, 110)) set.add(c);
    cache.set(handle, [...set]);
  }
  return cache.get(handle)!;
}

export function demoFriends(): FriendRow[] {
  return DEMO.map((d) => {
    const { path, ...f } = d;
    void path;
    return { ...f, cells: demoCells(f.handle).length };
  });
}
