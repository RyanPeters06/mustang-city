/**
 * Seasonal events (IDEAS §2): date-driven, no server needed. Each event has a perk that changes the game a little.
 *   Homecoming (late Sep–early Oct) · Haunted Forest State (Oct 20–31) · Frost City (Nov 15–Jan 15)
 */
export type SeasonEvent = { id: "homecoming" | "haunted" | "frost"; name: string; perk: string; surpriseMultiplier: number; glyph: string };

const SNOWFLAKE = "M12 2v20 M4.9 6l14.2 12 M19.1 6 4.9 18 M9 3.5 12 6l3-2.5 M9 20.5l3-2.5 3 2.5";
const PUMPKIN = "M12 7c-4 0-7 2.7-7 6.5S8 20 12 20s7-2.7 7-6.5S16 7 12 7z M12 7c0-2 1-3 2.5-3.5 M9.5 7.5C9 10 9 16 9.5 19.5 M14.5 7.5c.5 2.5.5 8.5 0 12";
const PENNANT = "M5 21V3 M5 4l14 4-14 4";

let cacheKey = "";
let cacheVal: SeasonEvent | null = null;

/** The event running on this date (cached per day, so it's a stable snapshot for React stores). */
export function currentEvent(now = new Date()): SeasonEvent | null {
  const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (key === cacheKey) return cacheVal;
  cacheKey = key;
  cacheVal = eventFor(now);
  return cacheVal;
}

function eventFor(now: Date): SeasonEvent | null {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if ((m === 11 && d >= 15) || m === 12 || (m === 1 && d <= 15))
    return { id: "frost", name: "Frost City", perk: "Surprises pay double all winter", surpriseMultiplier: 2, glyph: SNOWFLAKE };
  if (m === 10 && d >= 20) return { id: "haunted", name: "Haunted Forest State", perk: "Surprises pay double after dark", surpriseMultiplier: 2, glyph: PUMPKIN };
  if ((m === 9 && d >= 20) || (m === 10 && d <= 5)) return { id: "homecoming", name: "Homecoming", perk: "Surprises pay double during Homecoming", surpriseMultiplier: 2, glyph: PENNANT };
  return null;
}
