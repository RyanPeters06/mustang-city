// Extract every building footprint inside Western's campus boundary from Mapbox Streets v8 z15 tiles.
// Usage: node scripts/models/extract-campus.mjs <dir of z15 .pbf tiles named X-Y.pbf>  → scripts/models/campus-all.json
// Buildings split across tile edges are stitched back together (union of overlapping clipped pieces).
import fs from "node:fs";
import { VectorTile } from "@mapbox/vector-tile";
import Pbf from "pbf";
import pc from "polygon-clipping";

const dir = process.argv[2];
const ring = JSON.parse(fs.readFileSync("lib/data/campusBoundary.json", "utf8")).ring;
const names = JSON.parse(fs.readFileSync("lib/data/campusBuildings.json", "utf8"));
const inRing = ([x, y], r) => {
  let a = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) a = !a;
  }
  return a;
};
const tileBounds = (x, y, z = 15) => {
  const n = 2 ** z, lat = (t) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * t) / n))) * 180) / Math.PI;
  return [(x / n) * 360 - 180, lat(y + 1), ((x + 1) / n) * 360 - 180, lat(y)];
};

const whole = [], clipped = [];
for (const f of fs.readdirSync(dir)) {
  const [x, y] = f.replace(".pbf", "").split("-").map(Number);
  const [w, s, e, n] = tileBounds(x, y);
  const layer = new VectorTile(new Pbf(fs.readFileSync(`${dir}/${f}`))).layers.building;
  if (!layer) continue;
  for (let i = 0; i < layer.length; i++) {
    const ft = layer.feature(i);
    if (ft.properties.underground === "true") continue;
    const g = ft.toGeoJSON(x, y, 15).geometry;
    for (const poly of g.type === "Polygon" ? [g.coordinates] : g.coordinates) {
      const outer = poly[0];
      const c = outer.slice(0, -1).reduce((a, p) => [a[0] + p[0] / (outer.length - 1), a[1] + p[1] / (outer.length - 1)], [0, 0]);
      const isClipped = outer.some(([px, py]) => px <= w + 1e-7 || px >= e - 1e-7 || py <= s + 1e-7 || py >= n - 1e-7) &&
        outer.some(([px, py]) => px < w - 1e-7 || px > e + 1e-7 || py < s - 1e-7 || py > n + 1e-7);
      const item = { poly, height: ft.properties.height ?? 8, minHeight: ft.properties.min_height ?? 0, c, tile: f };
      // keep each unclipped piece once: only from the tile whose core contains its centroid
      if (isClipped) clipped.push(item);
      else if (c[0] >= w && c[0] < e && c[1] >= s && c[1] < n) whole.push(item);
    }
  }
}
// Stitch clipped pieces: union pieces with the same height that overlap.
const used = new Set();
for (let i = 0; i < clipped.length; i++) {
  if (used.has(i)) continue;
  let geom = [clipped[i].poly];
  used.add(i);
  for (let grow = true; grow; ) {
    grow = false;
    for (let j = 0; j < clipped.length; j++) {
      if (used.has(j) || clipped[j].height !== clipped[i].height) continue;
      if (pc.intersection(geom, [clipped[j].poly]).length) {
        geom = pc.union(geom, [clipped[j].poly]);
        used.add(j);
        grow = true;
      }
    }
  }
  for (const poly of geom) {
    const outer = poly[0];
    const c = outer.slice(0, -1).reduce((a, p) => [a[0] + p[0] / (outer.length - 1), a[1] + p[1] / (outer.length - 1)], [0, 0]);
    whole.push({ poly, height: clipped[i].height, minHeight: clipped[i].minHeight, c });
  }
}
const out = whole
  .filter((b) => inRing(b.c, ring))
  .map((b) => {
    const named = names.find((nm) => inRing([nm.lng, nm.lat], b.poly[0]));
    return {
      name: named?.name ?? null,
      residence: named?.residence ?? false,
      height: b.height,
      minHeight: b.minHeight,
      rings: b.poly.map((r) => r.map(([x, y]) => [+x.toFixed(7), +y.toFixed(7)])),
    };
  });
fs.writeFileSync("scripts/models/campus-all.json", JSON.stringify(out));
console.log(`buildings in campus: ${out.length} (named ${out.filter((b) => b.name).length}, residences ${out.filter((b) => b.residence).length})`);
