/** Client-side photo prep: decode → resize → JPEG data URL (keeps uploads well under Vercel's 4.5 MB limit). */

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through (older Safari / unusual formats) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(src: ImageBitmap | HTMLImageElement, maxSide: number, quality: number) {
  const w = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h = "naturalHeight" in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")!.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Returns the upload image (≤ 1080 px) and a small thumbnail for the profile (≤ 320 px). */
export async function preparePhoto(file: File) {
  const src = await decode(file);
  return { image: toJpeg(src, 1080, 0.8), thumb: toJpeg(src, 320, 0.7) };
}
