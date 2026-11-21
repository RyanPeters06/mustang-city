// Build lib/data/ltc.json from LTC's static GTFS (routes, one simplified shape per route+direction, stops near missions).
// Usage: node scripts/gtfs-build.mjs <path-to-unzipped-gtfs-dir>
// Source: https://www.londontransit.ca/gtfsfeed/google_transit.zip (London Transit Commission open data)
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/gtfs-build.mjs <gtfs dir>");

function csv(name) {
  const [head, ...lines] = fs.readFileSync(path.join(dir, name), "utf8").replace(/^﻿/, "").trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines.map((l) => {
    const v = l.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, v[i] ?? ""]));
  });
}

const toM = (a, b) => {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * 111320 * k, (a[1] - b[1]) * 111320);
};
function segDist(p, a, b) {
  const k = Math.cos((p[1] * Math.PI) / 180);
  const [px, py, ax, ay, bx, by] = [p[0] * k, p[1], a[0] * k, a[1], b[0] * k, b[1]];
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * 111320;
}
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], pts[0], pts.at(-1));
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [pts[0], pts.at(-1)];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}

const feed = csv("feed_info.txt")[0] ?? {};
const routes = csv("routes.txt").map((r) => ({ id: r.route_id, name: r.route_short_name.replace(/^0/, ""), long: r.route_long_name, color: `#${r.route_color || "2EE6D6"}` }));

// Most-used shape per route+direction.
const counts = new Map();
for (const t of csv("trips.txt")) {
  const key = `${t.route_id}|${t.direction_id}`;
  const m = counts.get(key) ?? new Map();
  m.set(t.shape_id, (m.get(t.shape_id) ?? 0) + 1);
  counts.set(key, m);
}
const wanted = new Map(); // shape_id -> {route, dir}
for (const [key, m] of counts) {
  const [route, dir] = key.split("|");
  const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  wanted.set(best, { route, dir: Number(dir) });
}
const pts = new Map();
for (const s of csv("shapes.txt")) {
  if (!wanted.has(s.shape_id)) continue;
  const a = pts.get(s.shape_id) ?? [];
  a.push([Number(s.shape_pt_sequence), Number(s.shape_pt_lon), Number(s.shape_pt_lat)]);
  pts.set(s.shape_id, a);
}
const shapes = [...pts.entries()].map(([id, a]) => {
  const line = a.sort((x, y) => x[0] - y[0]).map(([, lng, lat]) => [lng, lat]);
  const simple = simplify(line, 8).map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);
  return { route: wanted.get(id).route, dir: wanted.get(id).dir, line: simple };
});

// Stops near missions (for "next bus" on mission cards).
const missionSrc = fs.readFileSync("lib/missions.ts", "utf8");
const missionPts = [...missionSrc.matchAll(/lngLat: \[(-?[\d.]+), (-?[\d.]+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
const stops = csv("stops.txt")
  .map((s) => ({ id: s.stop_id, code: s.stop_code, name: s.stop_name.replace(/ - #\d+$/, ""), lngLat: [Number(s.stop_lon), Number(s.stop_lat)] }))
  .filter((s) => missionPts.some((p) => toM(p, s.lngLat) < 450));

const out = { source: "London Transit Commission GTFS (londontransit.ca/open-data)", version: feed.feed_version ?? "", start: feed.feed_start_date ?? "", routes, shapes, stops };
fs.writeFileSync("lib/data/ltc.json", JSON.stringify(out));
console.log(`routes ${routes.length}, shapes ${shapes.length} (${shapes.reduce((s, x) => s + x.line.length, 0)} pts), stops ${stops.length}, ${(fs.statSync("lib/data/ltc.json").size / 1024).toFixed(0)} KB`);
