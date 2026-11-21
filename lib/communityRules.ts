/** Student-written missions: shared rules + type (client + server). */
import { noteProblem } from "./tagRules";

export const STUDENT_MISSION_REP = 50;
export const STUDENT_DAILY_LIMIT = 3;
export const HIDE_AT_SCORE = -3; // community moderation: buried missions disappear
export type CommunityMission = {
  id: string;
  slug: string;
  title: string;
  briefing: string;
  lngLat: [number, number];
  radiusM: number;
  rep: number;
  score: number;
  myVote: -1 | 0 | 1;
  author: string;
  mine: boolean;
  kind: "server" | "sample";
};

export function missionProblem(title: string, briefing: string): string | null {
  const t = title.trim();
  if (t.length < 4 || t.length > 50) return "Title: 4–50 characters.";
  if (briefing.trim().length < 10) return "Write a briefing (at least 10 characters).";
  return noteProblem(t) ?? noteProblem(briefing); // same privacy checks as tags (no links, emails, phone numbers; ≤ 140)
}
