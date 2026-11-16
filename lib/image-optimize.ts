"use client";

/**
 * Client-side image processing for product photo uploads.
 *
 * Rebuilt in Phase X: every failure mode now surfaces a friendly,
 * Traditional-Chinese message instead of letting a raw browser/canvas
 * error bubble up to the user.
 */

export class ImageProcessingError extends Error {}

const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024; // 20MB — generous ceiling before we even try to decode it
const SUPPORTED_MIME_PREFIXES = ["image/"];
// HEIC/HEIF report an image/* mime type in some browsers but most engines
// cannot decode them via createImageBitmap — call that out specifically
// instead of a generic "unsupported format" message.
const KNOWN_UNSUPPORTED = ["image/heic", "image/heif"];

export function isImageFile(file: File): boolean {
  return SUPPORTED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
}

export function validateImageFile(file: File): void {
  if (!isImageFile(file)) {
    throw new ImageProcessingError("不支援的檔案格式，請選擇圖片檔案（JPG、PNG、WebP 等）。");
  }
  if (KNOWN_UNSUPPORTED.includes(file.type.toLowerCase())) {
    throw new ImageProcessingError("不支援 HEIC/HEIF 格式，請先轉換為 JPG 或 PNG 再上傳。");
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new ImageProcessingError("圖片檔案過大，請選擇 20MB 以下的圖片。");
  }
  if (file.size === 0) {
    throw new ImageProcessingError("這個檔案是空的，請重新選擇圖片。");
  }
}

/** Resizes an image file so its longest side is ~800px (upscaling never
 * happens) and re-encodes it as WebP, entirely in the browser via
 * <canvas>. Keeps uploads small and consistent without a server-side
 * image pipeline. */
export async function optimizeImageForUpload(
  file: File,
  { maxDimension = 800, quality = 0.85 }: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  validateImageFile(file);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageProcessingError("無法讀取這張圖片，檔案可能已損壞或格式不支援。");
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageProcessingError("這個瀏覽器不支援圖片處理功能，請改用其他瀏覽器。");

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new ImageProcessingError("圖片壓縮失敗，請再試一次。"))),
        "image/webp",
        quality,
      );
    });

    const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], newName, { type: "image/webp" });
  } finally {
    bitmap.close?.();
  }
}

export type ImageCrop = { x: number; y: number; width: number; height: number };

/** Creates an editable crop without uploading it. Final 800px WebP
 * optimization still happens through optimizeImageForUpload on save. */
export async function cropImageFile(file: File, crop: ImageCrop): Promise<File> {
  validateImageFile(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageProcessingError("無法讀取這張圖片，檔案可能已損壞或格式不支援。");
  }
  try {
    const x = Math.max(0, Math.min(crop.x, bitmap.width - 1));
    const y = Math.max(0, Math.min(crop.y, bitmap.height - 1));
    const width = Math.max(1, Math.min(crop.width, bitmap.width - x));
    const height = Math.max(1, Math.min(crop.height, bitmap.height - y));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const context = canvas.getContext("2d");
    if (!context) throw new ImageProcessingError("這個瀏覽器不支援圖片處理功能，請改用其他瀏覽器。");
    context.drawImage(bitmap, x, y, width, height, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new ImageProcessingError("圖片裁切失敗，請再試一次。")),
        "image/webp",
        0.92,
      );
    });
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "product"}-cropped.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}
