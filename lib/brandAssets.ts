import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Drop-in brand art (read at build time):
 * - public/brand/icon.png   → every app icon size is generated from it (falls back to the code-drawn emblem)
 * - public/cover/cover.*    → full cover collage shown on the loading/title screen
 * - public/cover/panel-*.*  → or individual comic panels, cycled on the loading screen
 */
const PUBLIC = join(process.cwd(), "public");
const IMG = /\.(webp|png|jpe?g|avif)$/i;

export type CoverArt = { kind: "collage"; src: string } | { kind: "panels"; srcs: string[] } | null;

export function coverArt(): CoverArt {
  const dir = join(PUBLIC, "cover");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => IMG.test(f)).sort();
  const collage = files.find((f) => /^cover\./i.test(f));
  if (collage) return { kind: "collage", src: `/cover/${collage}` };
  const panels = files.filter((f) => /^panel/i.test(f));
  return panels.length ? { kind: "panels", srcs: panels.map((f) => `/cover/${f}`) } : null;
}

/** Data URL of public/brand/icon.png, or null to use the code-drawn emblem. */
export function iconSource(): string | null {
  const file = join(PUBLIC, "brand", "icon.png");
  if (!existsSync(file)) return null;
  return `data:image/png;base64,${readFileSync(file).toString("base64")}`;
}
