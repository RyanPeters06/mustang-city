// Builds the comic-panel cover collage from the panel art in scripts/cover/.
//   node scripts/build-cover.mjs
// Outputs:
//   public/cover/cover.webp       portrait 9:16, picked up by the loading/title screen
//   public/cover/devpost.png      3:2 landscape, for the Devpost thumbnail and gallery
// Panels are clipped to angled polygons; thick black strokes on the shared edges make the gutters.
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
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
  logo: { file: art("scripts/cover/logo.webp"), knockout: true }, // near-black backdrop becomes transparent
  campus: art("public/loading/campus.webp"),
  uc: art("public/loading/university-college.webp"),
  middlesex: art("public/loading/middlesex.webp"),
};

const cache = new Map();
/** Loads an IMG entry as { uri, width, height }. */
async function load(src) {
  const key = typeof src === "string" ? src : JSON.stringify(src);
  if (cache.has(key)) return cache.get(key);
  const { file, crop, knockout } = typeof src === "string" ? { file: src } : src;
  let img = sharp(readFileSync(file));
  if (crop) img = img.extract(crop);
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

async function logo(cx, cy, size) {
  return `<image href="${(await load(IMG.logo)).uri}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}"/>`;
}

function tagline(cx, y, size) {
  return `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900"
    font-size="${size}" letter-spacing="${size * 0.18}" fill="#FFD27A">GRADUATE KNOWING YOUR CITY</text>`;
}

function frame(W, H, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${GUTTER}"/>
  ${body}
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${GUTTER}" stroke-width="44"/>
</svg>`;
}

async function portrait() {
  const W = 1080, H = 1920;
  const body = [
    await panel("p1", IMG.gooseBoss, [[0, 0], [600, 0], [560, 640], [0, 670]], [0.4, 0.1]),
    await panel("p2", IMG.delilahs, [[600, 0], [1080, 0], [1080, 610], [560, 640]], [0.5, 0.35]),
    await panel("p3", IMG.gooseAttack, [[0, 1250], [620, 1220], [660, 1920], [0, 1920]], [0.5, 0.45]),
    await panel("p4", IMG.bus, [[620, 1220], [1080, 1195], [1080, 1560], [641, 1580]], [0.3, 0.5]),
    await panel("p5", IMG.gas, [[641, 1580], [1080, 1560], [1080, 1920], [660, 1920]], [0.45, 0.6]),
    await logo(W / 2, 900, 600),
    tagline(W / 2, 1185, 30),
  ].join("\n");
  return { W, H, svg: frame(W, H, body) };
}

async function landscape() {
  const W = 1500, H = 1000;
  const body = [
    await panel("l1", IMG.gooseBoss, [[0, 0], [470, 0], [430, 560], [0, 600]], [0.4, 0.1]),
    await panel("l2", IMG.gooseAttack, [[0, 600], [430, 560], [470, 1000], [0, 1000]], [0.5, 0.5]),
    await panel("l3", IMG.delilahs, [[1030, 0], [1500, 0], [1500, 330], [1060, 350]], [0.5, 0.3]),
    await panel("l4", IMG.bus, [[1060, 350], [1500, 330], [1500, 680], [1045, 700]], [0.3, 0.45]),
    await panel("l5", IMG.gas, [[1045, 700], [1500, 680], [1500, 1000], [1030, 1000]], [0.45, 0.55]),
    await logo(W / 2, 450, 620),
    tagline(W / 2, 800, 24),
  ].join("\n");
  return { W, H, svg: frame(W, H, body) };
}

mkdirSync(art("public/cover"), { recursive: true });
const p = await portrait();
await sharp(Buffer.from(p.svg)).webp({ quality: 88 }).toFile(art("public/cover/cover.webp"));
const l = await landscape();
await sharp(Buffer.from(l.svg)).png().toFile(art("public/cover/devpost.png"));
console.log("wrote public/cover/cover.webp and public/cover/devpost.png");
