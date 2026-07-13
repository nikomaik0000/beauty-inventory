"use client";

import { createClient } from "@/lib/supabase/client";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/product-images-server";

/**
 * Supabase Storage upload for product images (client-side — this runs
 * from the browser, inside the admin product form).
 *
 * Deletion of the *old* image on replace/remove is handled server-side
 * now (see app/actions/products.ts), triggered only after the product
 * row is actually saved — not optimistically here — so an abandoned
 * edit (upload a new image, then navigate away without saving) can
 * never leave the database pointing at a file that's already gone.
 * Any orphan that scenario does leave behind in Storage is exactly
 * what the Storage Maintenance tool (/admin/settings) cleans up.
 */

export class ImageUploadError extends Error {}

function toFriendlyUploadError(rawMessage: string): ImageUploadError {
  const msg = rawMessage.toLowerCase();

  if (msg.includes("bucket not found")) {
    return new ImageUploadError(
      "找不到圖片儲存空間（product-images bucket）。請在 Supabase 執行 supabase/storage-setup.sql 建立好 Storage bucket 後再試一次。",
    );
  }
  if (msg.includes("row-level security") || msg.includes("permission") || msg.includes("unauthorized") || msg.includes("403")) {
    return new ImageUploadError("沒有上傳權限，請先登入後台帳號再試一次。");
  }
  if (msg.includes("exceeded") || msg.includes("too large") || msg.includes("payload too large")) {
    return new ImageUploadError("圖片超過大小限制，請選擇較小的圖片。");
  }
  if (msg.includes("mime type") || msg.includes("not allowed")) {
    return new ImageUploadError("不支援的圖片格式，請改用 JPG、PNG 或 WebP 圖片。");
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return new ImageUploadError("網路連線發生問題，請檢查網路連線後再試一次。");
  }

  return new ImageUploadError(`上傳失敗：${rawMessage}`);
}

const FILENAME_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Short (10-char), random, unique-enough filename — no timestamps, no
 * long UUIDs, no original/Chinese filenames, no spaces. 62^10 possible
 * values makes a collision astronomically unlikely for a personal-scale
 * inventory, so this deliberately doesn't add retry-on-conflict
 * complexity for a risk this small. */
function generateShortFilename(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let id = "";
  for (const byte of bytes) id += FILENAME_CHARS[byte % FILENAME_CHARS.length];
  return `${id}.webp`;
}

export async function uploadProductImage(file: File): Promise<string> {
  const supabase = createClient();
  const path = `products/${generateShortFilename()}`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw toFriendlyUploadError(error.message);

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new ImageUploadError("上傳成功，但無法取得圖片網址，請重新整理後再試一次。");

  return data.publicUrl;
}
