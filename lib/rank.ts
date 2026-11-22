/** Ranks (brief → Progression). Shared by client and server. */
export const RANKS = [
  { name: "Frosh", min: 0 },
  { name: "Local", min: 1000 },
  { name: "Made", min: 5000 },
  { name: "Legend of Forest State", min: 15000 },
] as const;

/** What each rank unlocks (IDEAS §2 "rank perks"): visible rewards for ranking up. Bag slots = 6 + rank index (lib/loot.ts). */
export const RANK_PERKS: Record<string, string[]> = {
  Frosh: ["6-slot loot bag", "Mustang, Goose, Compass and Bolt emblems"],
  Local: ["+1 bag slot", "Crown emblem"],
  Made: ["+2 bag slots", "Legend emblem", "Gold-trimmed HUD"],
  "Legend of Forest State": ["+3 bag slots", "Glowing Legend title"],
};

export function rankFor(rep: number) {
  const idx = [...RANKS].map((r) => rep >= r.min).lastIndexOf(true);
  return { rank: RANKS[Math.max(0, idx)].name as string, nextRank: (RANKS[idx + 1] ?? null) as { name: string; min: number } | null };
}

/** Fog Rep: ≈ 1 Rep per brief-sized (res-10) cell = 7 res-11 cells. */
export const fogRepFromCells = (cells: number) => Math.floor(cells / 7);
