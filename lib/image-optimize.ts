"use client";

/** Resizes an image file so its longest side is ~800px (upscaling never
 * happens) and re-encodes it as WebP, entirely in the browser via
 * <canvas>. Keeps uploads small and consistent without a server-side
 * image pipeline. */
export async function optimizeImageForUpload(
  file: File,
  { maxDimension = 800, quality = 0.85 }: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not encode image."))),
      "image/webp",
      quality,
    );
  });

  const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], newName, { type: "image/webp" });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}
