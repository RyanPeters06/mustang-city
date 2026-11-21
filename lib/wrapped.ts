"use client";
/** Graduation Wrapped: stats + fog timelapse from the player's own data (no invented numbers). */
import { cellToBoundary, cellToLatLng, getHexagonAreaAvg } from "h3-js";
import { cellsAround, getCells } from "./fog";
import { getRecordedTraces } from "./replay";
import { getSnapshot } from "./progress";
import { getDistrictStats } from "./districts";
import { MISSIONS, CATEGORY_LABEL } from "./missions";
import { BADGES } from "./badges";

export type WrappedData = {
  cellsInOrder: string[]; // oldest reveal first
  km2: number;
  pct: number;
  rep: number;
  rank: string;
  missions: number;
  photoMissions: number;
  landmarks: number;
  districtsUnlocked: number;
  topDistrict: { name: string; pct: number } | null;
  topCategory: string | null;
  badges: number;
  walks: number;
  walkedKm: number;
  name: string;
};

export function buildWrapped(): WrappedData {
  const all = new Set(getCells());
  const traces = getRecordedTraces();
  // Order: cells revealed along recorded walks in time order; anything older (or unrecorded) goes first.
  const seen = new Set<string>();
  const walked: string[] = [];
  let walkedM = 0;
  for (const t of traces) {
    for (let i = 0; i < t.points.length; i++) {
      const [lng, lat] = t.points[i];
      if (i > 0) {
        const [plng, plat] = t.points[i - 1];
        walkedM += Math.hypot((lng - plng) * 111320 * Math.cos((lat * Math.PI) / 180), (lat - plat) * 111320);
      }
      for (const c of cellsAround(lat, lng, 100)) {
        if (!all.has(c) || seen.has(c)) continue;
        seen.add(c);
        walked.push(c);
      }
    }
  }
  const before = [...all].filter((c) => !seen.has(c));
  const snap = getSnapshot();
  const done = Object.keys(snap.completions);
  const doneMissions = MISSIONS.filter((m) => done.includes(m.slug));
  const cats = new Map<string, number>();
  for (const m of doneMissions) if (m.category) cats.set(m.category, (cats.get(m.category) ?? 0) + 1);
  const topCat = [...cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as keyof typeof CATEGORY_LABEL | undefined;
  const top = [...getDistrictStats()].sort((a, b) => b.pct - a.pct)[0];

  return {
    cellsInOrder: [...before, ...walked],
    km2: all.size * getHexagonAreaAvg(11, "km2"),
    pct: snap.pct,
    rep: snap.rep,
    rank: snap.rank,
    missions: doneMissions.length,
    photoMissions: doneMissions.filter((m) => m.type === "photo").length,
    landmarks: doneMissions.filter((m) => m.category).length,
    districtsUnlocked: Object.keys(snap.districts).length,
    topDistrict: top && top.have > 0 ? { name: top.name, pct: top.pct } : null,
    topCategory: topCat ? CATEGORY_LABEL[topCat] : null,
    badges: BADGES.filter((b) => snap.badges[b.code]).length,
    walks: traces.length,
    walkedKm: walkedM / 1000,
    name: snap.profile.name || "Mustang",
  };
}

/**
 * Draw the fog timelapse frame: the first `upTo` cells (in reveal order) as glowing hexes on black,
 * framed on the explored area (at least ~3 km across).
 */
export function drawFog(ctx: CanvasRenderingContext2D, w: number, h: number, cells: string[], upTo: number) {
  ctx.fillStyle = "#05030b";
  ctx.fillRect(0, 0, w, h);
  if (!cells.length) return;
  const rings = cells.map((c) => cellToBoundary(c)); // [lat, lng][]
  const cellCenters = cells.map((c) => cellToLatLng(c));
  let [minX, minY, maxX, maxY] = [180, 90, -180, -90];
  for (const r of rings) for (const [lat, lng] of r) [minX, minY, maxX, maxY] = [Math.min(minX, lng), Math.min(minY, lat), Math.max(maxX, lng), Math.max(maxY, lat)];
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const kx = Math.cos((cy * Math.PI) / 180);
  const minSpan = 0.006; // degrees of latitude ≈ 650 m, so a first walk still fills the frame
  const spanY = Math.max(maxY - minY, (maxX - minX) * kx * (h / w), minSpan) * 1.15;
  const scale = h / spanY;
  const px = (lng: number) => w / 2 + (lng - cx) * kx * scale;
  const py = (lat: number) => h / 2 - (lat - cy) * scale;

  // faint grid
  ctx.strokeStyle = "rgba(46,230,214,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < w; x += w / 8) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y < h; y += w / 8) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  const n = Math.min(upTo, rings.length);
  // Soft glowing blobs (no hexagons): each cell is a radial light, blended additively so neighbours melt together.
  const cellPx = Math.max(3, Math.hypot(px(rings[0][0][1]) - px(rings[0][3][1]), py(rings[0][0][0]) - py(rings[0][3][0])));
  const r = cellPx * 1.6;
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const t = rings.length > 1 ? i / (rings.length - 1) : 1;
    // gold (oldest) → orange → pink (newest)
    const [cr, cg, cb] = t < 0.5 ? [255, 200 - t * 2 * 80, 87 - t * 2 * 10] : [255, 120 - (t - 0.5) * 2 * 41, 77 + (t - 0.5) * 2 * 62];
    const [lat, lng] = cellCenters[i];
    const x = px(lng), y = py(lat);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${cr | 0},${cg | 0},${cb | 0},0.3)`);
    g.addColorStop(0.5, `rgba(${cr | 0},${cg | 0},${cb | 0},0.24)`);
    g.addColorStop(1, `rgba(${cr | 0},${cg | 0},${cb | 0},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // the newest few sparkle white-hot
  for (let i = Math.max(0, n - 8); i < n; i++) {
    const [lat, lng] = cellCenters[i];
    const x = px(lng), y = py(lat);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
    g.addColorStop(0, "rgba(255,240,250,0.7)");
    g.addColorStop(1, "rgba(255,240,250,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = "source-over";
}
