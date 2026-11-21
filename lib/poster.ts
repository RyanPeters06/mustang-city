"use client";
/** Poster-style mission card (brief → Extended): sunset duotone photo + MISSION PASSED stamp, 1080×1350. */

const fullPhotos = new Map<string, string>(); // slug → full-res data URL (this session only; thumbs persist)
export const rememberPhoto = (slug: string, dataUrl: string) => fullPhotos.set(slug, dataUrl);
export const photoFor = (slug: string, thumb?: string) => fullPhotos.get(slug) ?? thumb ?? null;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/** Gradient map: luminance → night purple → pink → orange → gold. */
function duotone(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const stops: [number, [number, number, number]][] = [
    [0, [20, 10, 46]],
    [0.35, [123, 47, 247]],
    [0.6, [255, 79, 139]],
    [0.82, [255, 138, 61]],
    [1, [255, 227, 163]],
  ];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let j = 0;
    while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
    const [t0, c0] = stops[j];
    const [t1, c1] = stops[j + 1];
    const k = (t - t0) / (t1 - t0);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * k;
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let p = 0; p < d.length; p += 4) {
    const l = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
    const boosted = Math.min(255, Math.max(0, (l - 128) * 1.25 + 128)) | 0;
    d[p] = lut[boosted * 3];
    d[p + 1] = lut[boosted * 3 + 1];
    d[p + 2] = lut[boosted * 3 + 2];
  }
  ctx.putImageData(img, 0, 0);
}

export async function renderPoster(o: { photo: string; title: string; rep: number; date: number; kicker: string }): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const display = getComputedStyle(document.querySelector(".font-display") ?? document.body).fontFamily;
  const sans = getComputedStyle(document.body).fontFamily;

  // photo, cover-cropped, duotoned
  const img = await loadImage(o.photo);
  const s = Math.max(W / img.width, H / img.height);
  ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
  duotone(ctx, W, H);

  // scanlines + vignette
  ctx.fillStyle = "rgba(20,10,46,0.18)";
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(5,3,11,0.75)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const bottom = ctx.createLinearGradient(0, H * 0.55, 0, H);
  bottom.addColorStop(0, "rgba(5,3,11,0)");
  bottom.addColorStop(1, "rgba(5,3,11,0.92)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  // stamp
  ctx.save();
  ctx.translate(W / 2, H * 0.36);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.strokeStyle = "#ffe3a3";
  ctx.lineWidth = 10;
  ctx.strokeRect(-430, -130, 860, 260);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const g = ctx.createLinearGradient(0, -110, 0, 110);
  g.addColorStop(0, "#ffe3a3");
  g.addColorStop(0.5, "#ff8a3d");
  g.addColorStop(1, "#ff4f8b");
  ctx.fillStyle = g;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 24;
  ctx.font = `150px ${display}`;
  ctx.fillText("MISSION PASSED", 0, 8, 800);
  ctx.restore();

  // footer text
  ctx.textAlign = "left";
  ctx.fillStyle = "#2ee6d6";
  ctx.font = `700 30px ${sans}`;
  ctx.letterSpacing = "8px";
  ctx.fillText(o.kicker.toUpperCase(), 70, H - 250);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#f6efff";
  ctx.font = `92px ${display}`;
  ctx.fillText(o.title.toUpperCase(), 70, H - 150, W - 140);
  ctx.fillStyle = "#ff8a3d";
  ctx.font = `64px ${display}`;
  ctx.fillText(`+${o.rep} REP`, 70, H - 70);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(246,239,255,0.75)";
  ctx.font = `600 28px ${sans}`;
  ctx.fillText(`${new Date(o.date).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })} · FOREST STATE`, W - 70, H - 80);
  // sunset rule
  const rule = ctx.createLinearGradient(0, 0, W, 0);
  rule.addColorStop(0, "#ffc857");
  rule.addColorStop(0.3, "#ff8a3d");
  rule.addColorStop(0.6, "#ff4f8b");
  rule.addColorStop(1, "#7b2ff7");
  ctx.fillStyle = rule;
  ctx.fillRect(0, H - 14, W, 14);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

export async function sharePoster(blob: Blob, name: string): Promise<"shared" | "saved" | "cancelled"> {
  const file = new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Mission passed" });
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "saved";
}
