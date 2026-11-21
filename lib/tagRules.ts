/** Shared (client + server) rules for geo-pinned tags. */
export const TAG_VOTE_REP = 10; // brief → Rep table: "Your tag or mission gets upvoted"
export const TAG_MAX_CHARS = 140;
export const TAG_DAILY_LIMIT = 20;
export const TAG_MAX_PHOTO_B64 = 120_000; // ≤ 320 px thumbnail (~40–80 KB)

export type Tag = {
  id: string; // server id, or "local:…" / "demo:…"
  cell: string;
  lngLat: [number, number];
  note: string;
  photo: string | null;
  author: string;
  mine: boolean;
  votes: number;
  voted: boolean;
  createdAt: number;
  kind: "server" | "local" | "demo";
};

/**
 * Cheap checks before anything is stored: length, and no links / emails / phone numbers
 * (brief → privacy; tags are public to anyone who clears that spot).
 */
export function noteProblem(raw: string): string | null {
  const note = raw.trim();
  if (note.length < 2) return "Write something first.";
  if (note.length > TAG_MAX_CHARS) return `Keep it under ${TAG_MAX_CHARS} characters.`;
  if (/https?:\/\/|www\.|\b[\w.-]+\.(com|ca|net|org|io|ly)\b/i.test(note)) return "No links in tags.";
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(note)) return "No email addresses in tags.";
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(note)) return "No phone numbers in tags.";
  return null;
}
