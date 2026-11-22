/**
 * Reel maker (IDEAS §1 "heist trailer generator", single-player cut): a 9-second vertical video recorded on the
 * device with MediaRecorder from a canvas: cover art push-in → live map orbit with your stats → end card.
 * No server, no upload; the file is shared or saved by the player.
 */
import type { MapHandle } from "@/components/map/MapView";

export type ReelStats = { name: string; regions: number; totalRegions: number; rep: number; streak: number; rank: string };

const W = 720;
const H = 1280;

function pickMime() {
  const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

const loadImg = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });

function cover(g: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, scale = 1) {
  const k = Math.max(W / iw, H / ih) * scale;
  const w = iw * k;
  const h = ih * k;
  g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 800, align: CanvasTextAlign = "left") {
  g.font = `${weight} ${size}px sans-serif`;
  g.textAlign = align;
  g.lineWidth = Math.max(4, size / 6);
  g.strokeStyle = "rgba(0,0,0,0.85)";
  g.strokeText(s, x, y);
  g.fillStyle = color;
  g.fillText(s, x, y);
}

/** Record the reel. Resolves with a Blob (or null if the browser can't record). `onProgress` gets 0..1. */
export async function recordReel(map: MapHandle, stats: ReelStats, onProgress?: (p: number) => void): Promise<{ blob: Blob; ext: string } | null> {
  const mime = pickMime();
  if (!mime || typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const [coverImg, logo] = await Promise.all([loadImg("/cover/cover.webp"), loadImg("/cover/logo.png")]);

  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));

  let mapFrame: HTMLCanvasElement | null = null;
  const stopFrames = map.onFrame((c) => {
    // copy inside the render callback, while the WebGL buffer is valid
    mapFrame ??= document.createElement("canvas");
    if (mapFrame.width !== c.width) {
      mapFrame.width = c.width;
      mapFrame.height = c.height;
    }
    mapFrame.getContext("2d")!.drawImage(c, 0, 0);
  });

  const T = 9000;
  const start = performance.now();
  rec.start(250);
  map.flyToCity();
  setTimeout(() => map.orbit(true), 2200);

  await new Promise<void>((resolve) => {
    const frame = () => {
      const t = performance.now() - start;
      onProgress?.(Math.min(1, t / T));
      g.fillStyle = "#0c0618";
      g.fillRect(0, 0, W, H);
      if (t < 2200) {
        // 1. cover push-in
        if (coverImg) cover(g, coverImg, coverImg.naturalWidth, coverImg.naturalHeight, 1 + (t / 2200) * 0.12);
        g.globalAlpha = Math.min(1, t / 600);
        text(g, "FOREST STATE", W / 2, H - 150, 34, "#FFC857", 800, "center");
        g.globalAlpha = 1;
      } else if (t < 7400) {
        // 2. live map orbit + stats
        if (mapFrame) cover(g, mapFrame, mapFrame.width, mapFrame.height);
        const grad = g.createLinearGradient(0, H * 0.55, 0, H);
        grad.addColorStop(0, "rgba(12,6,24,0)");
        grad.addColorStop(1, "rgba(12,6,24,0.92)");
        g.fillStyle = grad;
        g.fillRect(0, H * 0.55, W, H * 0.45);
        text(g, stats.name.toUpperCase(), 48, H - 330, 30, "#FFC857");
        text(g, `${stats.regions}/${stats.totalRegions} REGIONS`, 48, H - 250, 64, "#2EE6D6", 900);
        text(g, `${stats.rep.toLocaleString()} REP · ${stats.rank.toUpperCase()}`, 48, H - 185, 34, "#F6EFFF");
        if (stats.streak > 0) text(g, `${stats.streak}-DAY STREAK`, 48, H - 130, 30, "#FF8A3D");
      } else {
        // 3. end card
        if (logo) {
          const lh = 520;
          const lw = (lh * logo.naturalWidth) / logo.naturalHeight;
          g.globalAlpha = Math.min(1, (t - 7400) / 400);
          g.drawImage(logo, (W - lw) / 2, H * 0.22, lw, lh);
          g.globalAlpha = 1;
        }
        text(g, "GRADUATE KNOWING YOUR CITY", W / 2, H * 0.22 + 600, 30, "#FFC857", 800, "center");
        text(g, "mustangcity.rodeo", W / 2, H * 0.22 + 660, 28, "#F6EFFF", 600, "center");
      }
      // letterbox
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, 70);
      g.fillRect(0, H - 70, W, 70);
      if (t < T) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });

  map.orbit(false);
  stopFrames();
  rec.stop();
  await done;
  const type = mime.split(";")[0];
  return { blob: new Blob(chunks, { type }), ext: type === "video/mp4" ? "mp4" : "webm" };
}
