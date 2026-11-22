// Builds the comic-panel cover collage from the panel art in scripts/cover/.
//   node scripts/build-cover.mjs
// Outputs:
//   public/cover/cover.webp       portrait 9:16, picked up by the loading/title screen
//   public/cover/devpost.png      3:2 landscape, for the Devpost thumbnail and gallery
// Panels are clipped to angled polygons; thick black strokes on the shared edges make the gutters.
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const art = (p) => join(ROOT, p);

// Panel art: a path, or { file, crop?, knockout? }. Swap or add entries as new panels arrive.
const IMG = {
  delilahs: { file: art("scripts/cover/delilahs.webp"), crop: { left: 150, top: 27, width: 709, height: 967 } }, // drop the cream matte
  gas: { file: art("scripts/cover/gas-station.webp"), crop: { left: 22, top: 25, width: 981, height: 978 } },
  bus: art("scripts/cover/bus.webp"),
  gooseBoss: { file: art("scripts/cover/goose-boss.webp"), crop: { left: 19, top: 16, width: 985, height: 1000 } },
  gooseAttack: { file: art("scripts/cover/goose-attack.webp"), crop: { left: 19, top: 20, width: 985, height: 977 } },
  middlesex: art("scripts/cover/middlesex.webp"),
  logo: { file: art("scripts/cover/logo.png"), trim: true }, // transparent PNG, trimmed to the artwork
};

const cache = new Map();
/** Loads an IMG entry as { uri, width, height }. */
async function load(src) {
  const key = typeof src === "string" ? src : JSON.stringify(src);
  if (cache.has(key)) return cache.get(key);
  const { file, crop, knockout, trim } = typeof src === "string" ? { file: src } : src;
  let img = sharp(readFileSync(file));
  if (crop) img = img.extract(crop);
  if (trim) img = sharp(await img.trim().toBuffer());
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (knockout) {
    // Alpha from brightness, so the logo's almost-black square fades into the black gutter.
    for (let i = 0; i < data.length; i += 4) {
      const m = Math.max(data[i], data[i + 1], data[i + 2]);
      data[i + 3] = Math.max(0, Math.min(255, (m - 22) * 6));
    }
  }
  const png = await sharp(data, { raw: info }).png().toBuffer();
  const out = { uri: `data:image/png;base64,${png.toString("base64")}`, width: info.width, height: info.height };
  cache.set(key, out);
  return out;
}

const GUTTER = "#000000";

/** pts: [[x,y],...]; focus: [fx, fy] 0..1 crop anchor inside the panel's bounding box. */
async function panel(id, img, pts, focus = [0.5, 0.5], zoom = 1) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  const meta = await load(img);
  // "slice" fit by hand so the focus point decides the crop.
  const s = Math.max(w / meta.width, h / meta.height) * zoom;
  const iw = meta.width * s, ih = meta.height * s;
  const ix = x0 - (iw - w) * focus[0];
  const iy = y0 - (ih - h) * focus[1];
  const poly = pts.map((p) => p.join(",")).join(" ");
  return `
  <clipPath id="${id}"><polygon points="${poly}"/></clipPath>
  <image href="${meta.uri}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" clip-path="url(#${id})" preserveAspectRatio="none"/>
  <polygon points="${poly}" fill="none" stroke="${GUTTER}" stroke-width="22" stroke-linejoin="round"/>`;
}

/**
 * The trimmed logo, `h` px tall, centred on (cx, cy), laid over the panels like a game cover's title.
 * A soft dark halo + hard drop shadow keep it legible on top of busy art.
 */
async function logo(cx, cy, h) {
  const l = await load(IMG.logo);
  const w = (h * l.width) / l.height;
  const s = h / 600; // shadow sizes scale with the logo
  return `
  <filter id="logo-pop" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="${18 * s}" result="halo"/>
    <feFlood flood-color="#000" flood-opacity="0.75"/>
    <feComposite in2="halo" operator="in" result="haloDark"/>
    <feOffset in="SourceAlpha" dx="0" dy="${10 * s}" result="drop"/>
    <feFlood flood-color="#000" flood-opacity="0.9"/>
    <feComposite in2="drop" operator="in" result="dropDark"/>
    <feMerge><feMergeNode in="haloDark"/><feMergeNode in="dropDark"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <image href="${l.uri}" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" filter="url(#logo-pop)"/>`;
}

function frame(W, H, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${GUTTER}"/>
  ${body}
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${GUTTER}" stroke-width="44"/>
</svg>`;
}

// Dense game-cover grid: panels tile the whole frame (no empty band), alternating gutter slopes, and the logo
// sits on top of them. The title screen reads positions from lib/data/coverLayers.json (written below).
export const PORTRAIT_LOGO = { cx: 540, cy: 700, h: 640 };

// Row gutters: (0,690)→(1080,640) and (0,1290)→(1080,1340). Column gutters slant the other way per row.
const PORTRAIT_PANELS = [
  ["p1", IMG.gooseBoss, [[0, 0], [590, 0], [560, 664], [0, 690]], [0.4, 0.05]],
  ["p2", IMG.middlesex, [[590, 0], [1080, 0], [1080, 640], [560, 664]], [0.62, 0.15]],
  ["p3", IMG.gas, [[0, 690], [600, 662], [650, 1320], [0, 1290]], [0.5, 0.7]],
  ["p4", IMG.delilahs, [[600, 662], [1080, 640], [1080, 1340], [650, 1320]], [0.5, 0.45]],
  ["p5", IMG.bus, [[0, 1290], [470, 1312], [430, 1920], [0, 1920]], [0.3, 0.5]],
  ["p6", IMG.gooseAttack, [[470, 1312], [1080, 1340], [1080, 1920], [430, 1920]], [0.5, 0.55]], // bottom row: nothing covers the faces
];

async function portrait() {
  const W = 1080, H = 1920;
  const body = [
    ...(await Promise.all(PORTRAIT_PANELS.map(([id, img, pts, focus]) => panel(id, img, pts, focus)))),
    await logo(PORTRAIT_LOGO.cx, PORTRAIT_LOGO.cy, PORTRAIT_LOGO.h),
  ].join("\n");
  return { W, H, svg: frame(W, H, body) };
}

/**
 * The same portrait cover as separate layers for the title screen's start animation (panels fly apart, then the
 * camera dives into the logo): one transparent image per panel cropped to its box, plus a manifest in cover pixels.
 */
async function portraitLayers() {
  const dir = art("public/cover/layers");
  mkdirSync(dir, { recursive: true });
  const PAD = 12; // room for the outer half of the gutter stroke
  const panels = [];
  for (const [id, img, pts, focus] of PORTRAIT_PANELS) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.max(0, Math.min(...xs) - PAD), y = Math.max(0, Math.min(...ys) - PAD);
    const w = Math.min(1080, Math.max(...xs) + PAD) - x, h = Math.min(1920, Math.max(...ys) + PAD) - y;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${await panel(id, img, pts, focus)}</svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 86, alphaQuality: 90 }).toFile(join(dir, `${id}.webp`));
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    panels.push({ src: `/cover/layers/${id}.webp`, x, y, w, h, cx: Math.round(cx), cy: Math.round(cy) });
  }
  const l = await load(IMG.logo);
  const lh = PORTRAIT_LOGO.h, lw = Math.round((lh * l.width) / l.height);
  const manifest = {
    w: 1080,
    h: 1920,
    panels,
    logo: { src: "/cover/logo.png", x: PORTRAIT_LOGO.cx - lw / 2, y: PORTRAIT_LOGO.cy - lh / 2, w: lw, h: lh },
    // Centre of the "MUSTANG CITY" lettering (lower ~45% of the logo): where the dive lands.
    words: { x: PORTRAIT_LOGO.cx, y: Math.round(PORTRAIT_LOGO.cy + lh * 0.27) },
  };
  writeFileSync(art("lib/data/coverLayers.json"), JSON.stringify(manifest, null, 2) + "\n");
}

async function landscape() {
  const W = 1500, H = 1000;
  // Column gutters: x = 520 - 0.04y and x = 990 + 0.04y; each column has its own row gutter.
  const body = [
    await panel("l1", IMG.gooseBoss, [[0, 0], [520, 0], [499, 520], [0, 540]], [0.4, 0.08]),
    await panel("l2", IMG.gooseAttack, [[0, 540], [499, 520], [480, 1000], [0, 1000]], [0.5, 0.55]),
    await panel("l3", IMG.gas, [[520, 0], [990, 0], [1012, 540], [500, 500]], [0.5, 0.45]),
    await panel("l4", IMG.delilahs, [[500, 500], [1012, 540], [1030, 1000], [480, 1000]], [0.5, 0.5]),
    await panel("l5", IMG.middlesex, [[990, 0], [1500, 0], [1500, 430], [1008, 460]], [0.62, 0.2]),
    await panel("l6", IMG.bus, [[1008, 460], [1500, 430], [1500, 1000], [1030, 1000]], [0.3, 0.45]),
    await logo(755, 480, 680),
  ].join("\n");
  return { W, H, svg: frame(W, H, body) };
}

mkdirSync(art("public/cover"), { recursive: true });
const p = await portrait();
await sharp(Buffer.from(p.svg)).webp({ quality: 88 }).toFile(art("public/cover/cover.webp"));
const l = await landscape();
await sharp(Buffer.from(l.svg)).png().toFile(art("public/cover/devpost.png"));
// Trimmed logo for the title screen's glint mask (components/intro/TitleFx.tsx).
await sharp(readFileSync(IMG.logo.file)).trim().resize({ height: 600 }).png().toFile(art("public/cover/logo.png"));
await portraitLayers();
console.log("wrote public/cover/{cover.webp,devpost.png,logo.png}, public/cover/layers/*.webp and lib/data/coverLayers.json");
