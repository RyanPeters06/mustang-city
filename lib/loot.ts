/**
 * Stash & carry (IDEAS §8, Ryan): loot drops into a limited carry bag out in Forest State and only counts once
 * it's banked at the stash: Mustang City, i.e. walking back onto campus. Gives every trip out a reason to come home.
 * Pure helpers; lib/progress.ts stores the bag/stash and handles drops and banking.
 */
export type Rarity = "common" | "rare" | "legendary";
export type LootItem = { id: string; name: string; rarity: Rarity; from: string; at: number };

export const LOOT_REP: Record<Rarity, number> = { common: 10, rare: 30, legendary: 100 };
export const BASE_BAG = 6;

const TABLE: Record<Rarity, string[]> = {
  common: ["Thames Pebble", "LTC Transfer Stub", "Forest City Postcard", "Goose Feather", "Coffee Punch Card", "Mixtape", "Campus Map Scrap", "Maple Leaf"],
  rare: ["Brass Door Knocker", "Vintage Concert Ticket", "Mustang Patch", "Lost Library Card", "Neon Bar Sign Bulb"],
  legendary: ["Golden Mustang Pin", "The Goose's Fedora", "Key to Forest State"],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic drop for a source (quest id, mission slug…). `boost` raises the odds (region claims). */
export function rollLoot(from: string, boost = 0): LootItem {
  const h = hash(from);
  const roll = (h % 1000) / 1000 - boost;
  const rarity: Rarity = roll < 0.04 ? "legendary" : roll < 0.24 ? "rare" : "common";
  const list = TABLE[rarity];
  return { id: `${from}#loot`, name: list[(h >>> 10) % list.length], rarity, from, at: Date.now() };
}

/** Bag size grows with rank (index in the rank ladder). */
export const bagSize = (rankIndex: number) => BASE_BAG + Math.max(0, rankIndex);

export const stashValue = (items: LootItem[]) => items.reduce((s, i) => s + LOOT_REP[i.rarity], 0);
