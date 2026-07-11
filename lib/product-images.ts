"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "product-images";

export async function uploadProductImage(file: File): Promise<string> {
  const supabase = createClient();
  const path = `${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort delete — storage cleanup should never block the product
 * save/delete flow it's attached to. */
export async function deleteProductImageByUrl(url: string): Promise<void> {
  try {
    const supabase = createClient();
    const marker = `/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length);
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // Non-fatal: an orphaned storage object is a cosmetic issue, not a
    // reason to fail the product save/delete the user is waiting on.
  }
}
