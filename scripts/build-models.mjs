// Build stylised low-poly glTF models of campus landmarks from real footprints + heights.
// Usage: node scripts/build-models.mjs   → public/models/*.glb + lib/data/campusModels.json
//
// Axes (verified against Mapbox's model layer): +X = east, +Y = up, +Z = south. Units: metres.
// Footprints/heights: scripts/models/footprints.json (Mapbox Streets v8, © OpenStreetMap contributors).
// Tower positions/heights: read from Mapbox satellite imagery (Maxar) + typical proportions — stylised, not surveyed.
import fs from "node:fs";
import earcut from "earcut";
import { Document, NodeIO, VertexLayout } from "@gltf-transform/core";

const SRC = JSON.parse(fs.readFileSync("scripts/models/footprints.json", "utf8"));
const M_PER_DEG = 111320;

// ---------- colour helpers (glTF wants linear) ----------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hex = (h) => [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));

// ---------- mesh builder: one primitive per material ----------
class Builder {
  constructor(anchor) {
    this.anchor = anchor;
    this.k = Math.cos((anchor[1] * Math.PI) / 180);
    this.parts = new Map(); // material -> {P,N,I}
  }
  // lon/lat -> local [east, north] metres
  en([lon, lat]) {
    return [(lon - this.anchor[0]) * M_PER_DEG * this.k, (lat - this.anchor[1]) * M_PER_DEG];
  }
  part(mat) {
    if (!this.parts.has(mat)) this.parts.set(mat, { P: [], N: [], I: [] });
    return this.parts.get(mat);
  }
  // quad from 4 points given as [east, up, north]
  quad(mat, a, b, c, d, n) {
    const p = this.part(mat);
    const o = p.P.length / 3;
    for (const v of [a, b, c, d]) p.P.push(v[0], v[1], -v[2]);
    for (let i = 0; i < 4; i++) p.N.push(n[0], n[1], -n[2]);
    p.I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  tri(mat, a, b, c, n) {
    const p = this.part(mat);
    const o = p.P.length / 3;
    for (const v of [a, b, c]) p.P.push(v[0], v[1], -v[2]);
    for (let i = 0; i < 3; i++) p.N.push(n[0], n[1], -n[2]);
    p.I.push(o, o + 1, o + 2);
  }
  /** Vertical walls along a CCW ring (local EN), from y0 to y1, offset outward by `out`. */
  walls(mat, ring, y0, y1, out = 0) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [ae, an] = ring[i];
      const [be, bn] = ring[i + 1];
      const L = Math.hypot(be - ae, bn - an);
      if (L < 0.05) continue;
      const n = [(bn - an) / L, 0, -(be - ae) / L]; // outward for CCW
      const o = [n[0] * out, n[2] * out];
      this.quad(mat, [ae + o[0], y0, an + o[1]], [be + o[0], y0, bn + o[1]], [be + o[0], y1, bn + o[1]], [ae + o[0], y1, an + o[1]], n);
    }
  }
  /** Flat cap (with holes) at height y, normal up. Rings in local EN. */
  cap(mat, rings, y) {
    const flat = [];
    const holes = [];
    rings.forEach((r, i) => {
      if (i) holes.push(flat.length / 2);
      for (const [e, n] of r.slice(0, -1)) flat.push(e, n);
    });
    const idx = earcut(flat, holes, 2);
    for (let i = 0; i < idx.length; i += 3) {
      const v = (j) => [flat[idx[j] * 2], y, flat[idx[j] * 2 + 1]];
      this.tri(mat, v(i), v(i + 1), v(i + 2), [0, 1, 0]);
    }
  }
  /** Rows of windows on every wall of a ring. */
  windows(mat, ring, height, { w = 1.3, h = 1.5, every = 3.0, floor = 3.3, first = 1.1, out = 0.06, lancet = false } = {}) {
    const floors = Math.max(1, Math.floor((height - first - 0.8) / floor));
    for (let i = 0; i < ring.length - 1; i++) {
      const [ae, an] = ring[i];
      const [be, bn] = ring[i + 1];
      const L = Math.hypot(be - ae, bn - an);
      if (L < every) continue;
      const ux = (be - ae) / L;
      const un = (bn - an) / L;
      const n = [un, 0, -ux];
      const count = Math.floor((L - 0.6) / every);
      const start = (L - count * every) / 2 + every / 2;
      for (let f = 0; f < floors; f++) {
        const y0 = first + f * floor;
        const y1 = y0 + (lancet ? h * 1.4 : h);
        for (let c = 0; c < count; c++) {
          const t = start + c * every;
          const p0 = [ae + ux * (t - w / 2) + n[0] * out, an + un * (t - w / 2) + n[2] * out];
          const p1 = [ae + ux * (t + w / 2) + n[0] * out, an + un * (t + w / 2) + n[2] * out];
          this.quad(mat, [p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], n);
          if (lancet) {
            // pointed arch top
            const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
            this.tri(mat, [p0[0], y1, p0[1]], [p1[0], y1, p1[1]], [m[0], y1 + w * 0.6, m[1]], n);
          }
        }
      }
    }
  }
  /** Axis-aligned box (in local EN) — for towers, merlons, pinnacles. */
  box(mat, [ce, cn], [se, sn], y0, y1, top = true) {
    const r = [
      [ce - se / 2, cn - sn / 2],
      [ce + se / 2, cn - sn / 2],
      [ce + se / 2, cn + sn / 2],
      [ce - se / 2, cn + sn / 2],
      [ce - se / 2, cn - sn / 2],
    ];
    this.walls(mat, r, y0, y1);
    if (top) this.cap(mat, [r], y1);
    return r;
  }
  /** Regular n-gon prism + optional pyramid roof. */
  prism(mat, [ce, cn], radius, sides, y0, y1, rot = Math.PI / sides) {
    const r = [];
    for (let i = 0; i <= sides; i++) {
      const a = rot + (i * 2 * Math.PI) / sides;
      r.push([ce + Math.cos(a) * radius, cn + Math.sin(a) * radius]);
    }
    this.walls(mat, r, y0, y1);
    return r;
  }
  pyramid(mat, ring, y0, apex) {
    const pts = ring.slice(0, -1);
    const ce = pts.reduce((s2, p) => s2 + p[0], 0) / pts.length;
    const cn = pts.reduce((s2, p) => s2 + p[1], 0) / pts.length;
    for (let i = 0; i < ring.length - 1; i++) {
      const a = [ring[i][0], y0, ring[i][1]];
      const b = [ring[i + 1][0], y0, ring[i + 1][1]];
      const c = [ce, apex, cn];
      // face normal = (b-a) x (c-a), flipped to point outward/up
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const len = Math.hypot(...n) || 1;
      n = n.map((x) => x / len);
      if (n[1] < 0) n = n.map((x) => -x);
      this.tri(mat, a, b, c, n);
    }
  }
  /** Flat disc facing outward on a wall (clock face). */
  disc(mat, [ce, cn], y, radius, normal, sides = 12) {
    const tE = [-normal[2], normal[0]]; // tangent along the wall in EN
    for (let i = 0; i < sides; i++) {
      const a0 = (i * 2 * Math.PI) / sides;
      const a1 = ((i + 1) * 2 * Math.PI) / sides;
      const pt = (a) => [ce + tE[0] * Math.cos(a) * radius, y + Math.sin(a) * radius, cn + tE[1] * Math.cos(a) * radius];
      this.tri(mat, [ce, y, cn], pt(a0), pt(a1), [normal[0], 0, normal[2]]);
    }
  }
}

/** Horizontal ribbon windows (modernist concrete): one long strip per floor per wall. */
Builder.prototype.ribbons = function (mat, ring, height, { floor = 3.6, first = 1.4, h = 1.1, inset = 0.8, out = 0.06 } = {}) {
  const floors = Math.max(1, Math.floor((height - first - 0.6) / floor));
  for (let i = 0; i < ring.length - 1; i++) {
    const [ae, an] = ring[i];
    const [be, bn] = ring[i + 1];
    const L = Math.hypot(be - ae, bn - an);
    if (L < 2 * inset + 1) continue;
    const ux = (be - ae) / L, un = (bn - an) / L;
    const n = [un, 0, -ux];
    const p0 = [ae + ux * inset + n[0] * out, an + un * inset + n[2] * out];
    const p1 = [be - ux * inset + n[0] * out, bn - un * inset + n[2] * out];
    for (let f = 0; f < floors; f++) {
      const y0 = first + f * floor;
      this.quad(mat, [p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y0 + h, p1[1]], [p0[0], y0 + h, p0[1]], n);
    }
  }
};
/** Curtain wall: glass skin on every wall with slim horizontal frame lines per floor. */
Builder.prototype.curtain = function (glass, frame, ring, height, { floor = 3.6 } = {}) {
  this.walls(glass, ring, 0.6, height - 0.4, 0.04);
  for (let y = 0.6 + floor; y < height - 0.6; y += floor) this.walls(frame, ring, y - 0.12, y + 0.12, 0.09);
};

function ccw(ring) {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return s > 0 ? ring : [...ring].reverse();
}
const centroid = (ring) => {
  const pts = ring.slice(0, -1);
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
};

// ---------- materials ----------
const PALETTE = {
  mcStone: { color: "#e6cfae", rough: 0.92 },
  ucStone: { color: "#dcc29c", rough: 0.92 },
  trim: { color: "#f4e5cb", rough: 0.8 },
  roof: { color: "#4a4166", rough: 0.95 },
  window: { color: "#24183f", rough: 0.35, emissive: "#ffcf7a" },
  belfry: { color: "#120a24", rough: 0.9 },
  copper: { color: "#5fa58f", rough: 0.6, metal: 0.3 },
  clock: { color: "#f6efff", rough: 0.5, emissive: "#fff6dc" },
  sandstone: { color: "#e2c8a3", rough: 0.92 },
  concrete: { color: "#aaa2b4", rough: 0.95 },
  glassWall: { color: "#3b4a6e", rough: 0.15, metal: 0.4, emissive: "#3a6fa8" },
  frame: { color: "#c9cdd6", rough: 0.6, metal: 0.2 },
  brick: { color: "#b98478", rough: 0.95 },
  plant: { color: "#8c84a3", rough: 0.8, metal: 0.2 },
};

async function writeGlb(builders, file) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const scene = doc.createScene();
  const mats = new Map();
  const list = Array.isArray(builders) ? builders : [builders];
  for (const [bi, builder] of list.entries()) {
  const mesh = doc.createMesh(`${file}-${bi}`);
  for (const [name, p] of builder.parts) {
    const spec = PALETTE[name];
    let mat = mats.get(name);
    if (!mat) {
      mat = doc.createMaterial(name).setBaseColorFactor([...hex(spec.color), 1]).setRoughnessFactor(spec.rough).setMetallicFactor(spec.metal ?? 0).setDoubleSided(true);
      if (spec.emissive) mat.setEmissiveFactor(hex(spec.emissive));
      mats.set(name, mat);
    }
    if (p.P.length / 3 > 65535) throw new Error(`${file}/${name}: too many vertices for uint16`);
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(p.P)).setBuffer(buf))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(p.N)).setBuffer(buf))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint16Array(p.I)).setBuffer(buf))
      .setMaterial(mat);
    mesh.addPrimitive(prim);
  }
  scene.addChild(doc.createNode(`${file}-${bi}`).setMesh(mesh));
  }
  doc.getRoot().setDefaultScene(scene);
  // Mapbox's loader needs non-interleaved vertex buffers.
  await new NodeIO().setVertexLayout(VertexLayout.SEPARATE).write(`public/models/${file}.glb`, doc);
  const tris = list.reduce((t, bl) => t + [...bl.parts.values()].reduce((s, p) => s + p.I.length / 3, 0), 0);
  console.log(`${file}.glb  ${(fs.statSync(`public/models/${file}.glb`).size / 1024).toFixed(0)} KB  ${tris} tris`);
}

const manifest = [];

// ================= Middlesex College =================
{
  const b = SRC.buildings["middlesex-college"];
  const outer = ccw(b.rings[0]);
  const anchor = centroid(outer);
  const B = new Builder(anchor);
  const ring = outer.map((p) => B.en(p));
  const H = b.height; // 9.1 m (Mapbox)
  B.walls("mcStone", ring, 0, H);
  B.cap("roof", [ring], H);
  B.walls("trim", ring, H - 0.5, H + 0.25, 0.12); // stone cornice
  B.windows("window", ring, H, { every: 3.2, lancet: false });

  // Tower: verdigris-roofed tower by the main entrance (position read from satellite imagery).
  const T = B.en([-81.270217, 43.00944]);
  const s = 7.4;
  const towerTop = 24;
  const tr = B.box("mcStone", T, [s, s], 0, towerTop, false);
  B.windows("window", tr, 16, { w: 0.9, h: 2.0, every: 2.4, floor: 5.5, first: 9.5, lancet: true });
  // belfry openings + clock faces on all four sides
  for (const [nx, nn] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const face = [T[0] + nx * (s / 2 + 0.05), T[1] + nn * (s / 2 + 0.05)];
    B.disc("clock", face, 17.6, 1.35, [nx, 0, nn]);
    const t = [-nn, nx];
    for (const off of [-1.6, 1.6]) {
      const c = [face[0] + t[0] * off, face[1] + t[1] * off];
      B.quad("belfry", [c[0] - t[0] * 0.5, 20.2, c[1] - t[1] * 0.5], [c[0] + t[0] * 0.5, 20.2, c[1] + t[1] * 0.5], [c[0] + t[0] * 0.5, 23, c[1] + t[1] * 0.5], [c[0] - t[0] * 0.5, 23, c[1] - t[1] * 0.5], [nx, 0, nn]);
    }
  }
  B.walls("trim", tr, towerTop - 0.4, towerTop + 0.3, 0.15);
  B.cap("roof", [tr], towerTop);
  for (const [dx, dn] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.box("trim", [T[0] + (dx * s) / 2, T[1] + (dn * s) / 2], [0.9, 0.9], towerTop, towerTop + 2.6);
  const drum = B.prism("copper", T, 2.9, 8, towerTop, towerTop + 2.8);
  B.pyramid("copper", drum, towerTop + 2.8, towerTop + 10.5);

  await writeGlb(B, "middlesex-college");
  manifest.push({ id: "middlesex-college", name: b.name, url: "/models/middlesex-college.glb", anchor, footprint: [outer], heights: [H] });
}

// ================= University College =================
{
  const b = SRC.buildings["university-college"];
  const t = SRC.buildings["uc-tower"];
  const outer = ccw(b.rings[0]);
  const anchor = centroid(outer);
  const B = new Builder(anchor);
  const ring = outer.map((p) => B.en(p));
  const H = b.height; // 9.3 m
  B.walls("ucStone", ring, 0, H);
  B.cap("roof", [ring], H);
  B.walls("trim", ring, H - 0.5, H + 0.25, 0.12);
  B.windows("window", ring, H, { every: 3.0, lancet: true, h: 1.3 });

  // Middlesex Memorial Tower (footprint + 24.8 m height from Mapbox), crenellated with corner turrets.
  const tower = ccw(t.rings[0]).map((p) => B.en(p));
  const TH = t.height;
  B.walls("ucStone", tower, 0, TH);
  B.cap("roof", [tower], TH);
  B.windows("window", tower, TH - 2, { w: 1.0, h: 2.2, every: 2.6, floor: 6, first: 10.5, lancet: true });
  B.walls("trim", tower, TH - 0.4, TH + 0.2, 0.15);
  for (let i = 0; i < tower.length - 1; i++) {
    const [ae, an] = tower[i];
    const [be, bn] = tower[i + 1];
    const L = Math.hypot(be - ae, bn - an);
    const n = Math.floor(L / 1.5);
    for (let k = 0; k < n; k += 2) {
      const tt = (k + 0.5) / n;
      B.box("ucStone", [ae + (be - ae) * tt, an + (bn - an) * tt], [0.75, 0.75], TH, TH + 1.1);
    }
    B.box("ucStone", [ae, an], [1.5, 1.5], TH, TH + 2.4); // corner turret
  }

  await writeGlb(B, "university-college");
  manifest.push({ id: "university-college", name: b.name, url: "/models/university-college.glb", anchor, footprint: [outer, ccw(t.rings[0])], heights: [H, TH] });
}

// ================= Campus core (styled by architecture) =================
{
  const core = Object.entries(SRC.core);
  const all = core.flatMap(([, b]) => b.rings[0].slice(0, -1));
  const anchor = [all.reduce((s, p) => s + p[0], 0) / all.length, all.reduce((s, p) => s + p[1], 0) / all.length];
  const builders = [];
  const footprint = [];
  const heights = [];
  for (const [, b] of core) {
    const B = new Builder(anchor);
    const outer = ccw(b.rings[0]);
    const holes = b.rings.slice(1).map((r) => [...ccw(r)].reverse());
    const ring = outer.map((p) => B.en(p));
    const holeRings = holes.map((r) => r.map((p) => B.en(p)));
    const H = Math.max(b.height, 6);
    if (b.style === "sandstone") {
      B.walls("sandstone", ring, 0, H);
      B.walls("trim", ring, H - 0.5, H + 0.25, 0.12);
      B.windows("window", ring, H, { every: 3.0, lancet: true, h: 1.3 });
    } else if (b.style === "concrete") {
      B.walls("concrete", ring, 0, H);
      B.walls("concrete", ring, H - 0.9, H + 0.2, 0.25); // heavy fascia
      B.ribbons("window", ring, H);
    } else {
      B.walls("frame", ring, 0, H);
      B.curtain("glassWall", "frame", ring, H);
    }
    for (const hr of holeRings) B.walls(b.style === "glass" ? "frame" : b.style, hr, 0, H);
    B.cap("roof", [ring, ...holeRings], H);
    builders.push(B);
    footprint.push(outer);
    heights.push(H);
  }
  await writeGlb(builders, "campus-core");
  manifest.push({ id: "campus-core", name: "Campus core", url: "/models/campus-core.glb", anchor, footprint, heights });
}

// ================= Every other building inside Mustang City =================
{
  const all = JSON.parse(fs.readFileSync("scripts/models/campus-all.json", "utf8"));
  const taken = manifest.flatMap((m) => m.footprint);
  const inR = ([x, y], r) => {
    let a = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) a = !a;
    }
    return a;
  };
  const rest = all.filter((b) => {
    const c = centroid(b.rings[0]);
    return !taken.some((t) => inR(c, t) || t.some((v) => inR(v, b.rings[0])));
  });
  const pts = rest.flatMap((b) => b.rings[0].slice(0, -1));
  const anchor = [pts.reduce((s2, p) => s2 + p[0], 0) / pts.length, pts.reduce((s2, p) => s2 + p[1], 0) / pts.length];
  const builders = [];
  const footprint = [];
  const heights = [];
  let B = new Builder(anchor);
  let tris = 0;
  const area = (r) => {
    let a = 0;
    for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    return Math.abs(a / 2);
  };
  for (const b of rest) {
    const outer = ccw(b.rings[0]);
    const ring = outer.map((p) => B.en(p));
    const A = area(ring);
    const H = Math.max(b.height, 3);
    const y0 = Math.min(b.minHeight ?? 0, H - 1);
    const style = A < 40 || H < 3.5 ? "shed" : b.residence ? "brick" : H >= 18 ? "glass" : "sandstone";
    if (style === "glass") {
      B.walls("frame", ring, y0, H);
      B.curtain("glassWall", "frame", ring, H);
    } else {
      const mat = style === "brick" ? "brick" : "sandstone";
      B.walls(mat, ring, y0, H);
      if (style !== "shed") B.windows("window", ring, H, { every: 3.4, lancet: style === "sandstone", h: 1.3, first: Math.max(1.1, y0 + 1.1) });
    }
    if (style !== "shed") B.walls(style === "glass" ? "frame" : "trim", ring, H, H + 0.55, 0); // parapet rim
    B.cap("roof", [ring], H);
    // rooftop mechanical units on big roofs (deterministic placement)
    if (A > 700 && style !== "shed") {
      const c = ring.slice(0, -1).reduce((s2, p) => [s2[0] + p[0] / (ring.length - 1), s2[1] + p[1] / (ring.length - 1)], [0, 0]);
      const units = A > 2500 ? 3 : A > 1400 ? 2 : 1;
      for (let u = 0; u < units; u++) {
        const off = [(u - (units - 1) / 2) * 7, (u % 2) * 4 - 2];
        const pos = [c[0] + off[0], c[1] + off[1]];
        if (inR(pos, ring)) B.box("plant", pos, [4.5, 3], H, H + 1.8);
      }
    }
    footprint.push(outer);
    heights.push(H);
    tris = [...B.parts.values()].reduce((s2, p) => s2 + p.I.length / 3, 0);
    if (tris > 9000) {
      builders.push(B);
      B = new Builder(anchor);
    }
  }
  if (B.parts.size) builders.push(B);
  await writeGlb(builders, "campus-rest");
  manifest.push({ id: "campus-rest", name: "Mustang City", url: "/models/campus-rest.glb", anchor, footprint, heights });
  console.log(`campus-rest: ${rest.length} buildings`);
}

fs.writeFileSync("lib/data/campusModels.json", JSON.stringify(manifest));
console.log("manifest:", manifest.map((m) => m.id).join(", "));
