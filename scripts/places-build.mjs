// Real local places per neighbourhood, for region quests ("grab a coffee at a local café in Old East Village").
//   node scripts/places-build.mjs            (fetches OpenStreetMap via the public Overpass API)
//   node scripts/places-build.mjs raw.json   (re-uses a saved Overpass response)
// Output: lib/data/places.json  →  [{ n: name, c: category, p: [lng, lat], d: district index }]
// Data © OpenStreetMap contributors, ODbL.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const districts = JSON.parse(readFileSync(join(ROOT, "lib/data/districts.json"), "utf8"));

const BBOX = "42.82,-81.40,43.08,-81.10"; // London, Ontario (s,w,n,e)
const QUERY = `[out:json][timeout:90];
(
  node["amenity"="cafe"]["name"](${BBOX});
  node["amenity"~"^(restaurant|fast_food|pub|bar|ice_cream)$"]["name"](${BBOX});
  node["shop"~"^(bakery|books|clothes|gift|music|video_games|comic|second_hand|deli|chocolate|art|mall|department_store|games|bicycle)$"]["name"](${BBOX});
  way["leisure"="park"]["name"](${BBOX});
  node["tourism"~"^(museum|gallery|viewpoint|artwork|attraction)$"]["name"](${BBOX});
  way["tourism"~"^(museum|gallery|attraction)$"]["name"](${BBOX});
);
out center tags;`;

function category(t) {
  if (t.amenity === "cafe") return "cafe";
  if (/^(restaurant|fast_food|pub|bar|ice_cream)$/.test(t.amenity ?? "")) return "food";
  if (t.shop) return "shop";
  if (t.leisure === "park") return "park";
  if (t.tourism) return "culture";
  return null;
}

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const districtOf = (p) =>
  districts.findIndex((d) => d.polygons.some((poly) => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h))));

let raw;
if (process.argv[2]) raw = JSON.parse(readFileSync(process.argv[2], "utf8"));
else {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "mustang-city-build/1.0" },
    body: "data=" + encodeURIComponent(QUERY),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`);
  raw = await res.json();
}

const PER_DISTRICT_PER_CAT = 30; // keeps the bundle small; plenty to pick from
const seen = new Set();
const buckets = new Map();
for (const el of raw.elements) {
  const t = el.tags ?? {};
  const c = category(t);
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!c || lat == null || !t.name) continue;
  const p = [+lng.toFixed(5), +lat.toFixed(5)];
  const d = districtOf(p);
  if (d < 0) continue;
  const key = `${t.name}|${c}|${d}`;
  if (seen.has(key)) continue; // chains / duplicated nodes
  seen.add(key);
  const k = `${d}|${c}`;
  if (!buckets.has(k)) buckets.set(k, []);
  buckets.get(k).push({ n: t.name, c, p, d });
}
const out = [...buckets.values()].flatMap((list) => list.slice(0, PER_DISTRICT_PER_CAT));
writeFileSync(join(ROOT, "lib/data/places.json"), JSON.stringify(out));

const byCat = out.reduce((m, x) => ((m[x.c] = (m[x.c] ?? 0) + 1), m), {});
const covered = new Set(out.map((x) => x.d)).size;
console.log(`places: ${out.length}`, byCat, `districts with places: ${covered}/${districts.length}`);
