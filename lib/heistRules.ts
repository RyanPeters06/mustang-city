/** Heist rules shared by server and client (brief → "heist missions needing 3+ players within radius/time window"). */
export const HEIST_CREW = 3;
export const HEIST_WINDOW_MS = 15 * 60_000;
export type HeistStatus = { state: "none" | "open" | "complete" | "expired"; members: number; needed: number; expiresAt: number | null; joined: boolean };
