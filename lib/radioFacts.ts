/** Stored, sourced facts the radio host may use for a neighbourhood (never generated). */
import { DISTRICTS, districtAt } from "./districts";
import { MISSIONS } from "./missions";
import { distanceM } from "./geo";

export const STATION = "Forest FM";

export function radioFacts(district: string): { facts: string[]; jobs: number } {
  const d = DISTRICTS.find((x) => x.name === district);
  if (!d) return { facts: [], jobs: 0 };
  const inside = MISSIONS.filter((m) => districtAt(m.lngLat) === district);
  // Landmarks inside first, then the nearest landmarks within 2 km of the district label.
  const near = MISSIONS.filter((m) => m.brief && !inside.includes(m) && distanceM(m.lngLat, d.label) < 2000).sort(
    (a, b) => distanceM(a.lngLat, d.label) - distanceM(b.lngLat, d.label),
  );
  const facts = [...inside.filter((m) => m.brief), ...near].slice(0, 3).map((m) => `${m.title}. ${m.brief!}`);
  return { facts, jobs: inside.length };
}

/** No-AI fallback: a template that only quotes stored facts verbatim. */
export function templateScript(district: string, facts: string[], jobs: number): string {
  const open = `You're tuned to ${STATION}. You just rolled into ${district}.`;
  const pick = facts.length ? facts[Math.floor(Date.now() / 60_000) % facts.length] : null;
  const fact = pick ? ` From the archive: ${pick}` : " Every street you walk clears a little more fog.";
  const close = jobs ? ` The Goose has ${jobs === 1 ? "a job" : `${jobs} jobs`} out here. Stay sharp.` : " Keep walking, Mustang.";
  return open + fact + close;
}
