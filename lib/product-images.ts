"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Supabase Storage upload/delete for product images.
 *
 * Rebuilt in Phase X to turn raw Storage errors (like the "Bucket not
 * found" error this replaces) into a friendly message that tells the
 * person what to actually do, instead of a bare error string.
 */

const BUCKET = "product-images";

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

export async function uploadProductImage(file: File): Promise<string> {
  const supabase = createClient();
  const path = `${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw toFriendlyUploadError(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new ImageUploadError("上傳成功，但無法取得圖片網址，請重新整理後再試一次。");

  return data.publicUrl;
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/** Best-effort delete — storage cleanup should never block the product
 * save/delete flow it's attached to, so failures are swallowed here. */
export async function deleteProductImageByUrl(url: string): Promise<void> {
  try {
    const path = pathFromPublicUrl(url);
    if (!path) return;
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // Non-fatal: an orphaned storage object is a cosmetic issue, not a
    // reason to fail the product save/delete the user is waiting on.
  }
}
