import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** Extracts the storage object path from a public Supabase Storage URL,
 * e.g. ".../storage/v1/object/public/product-images/abc123.webp" →
 * "abc123.webp". Returns null for anything that isn't a URL in this
 * bucket (defensive — a null/malformed image_url should never throw). */
export function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${PRODUCT_IMAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/** Best-effort delete, given a server-side Supabase client (from
 * lib/supabase/server). Never throws — a leftover Storage object is a
 * cosmetic issue the Storage Maintenance tool can clean up later, not a
 * reason to fail the product save/delete the person is waiting on. */
export async function deleteProductImageServer(
  supabase: SupabaseClient,
  url: string | null | undefined,
): Promise<void> {
  const path = extractStoragePath(url);
  if (!path) return;
  try {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  } catch {
    // Non-fatal — see Storage Maintenance (app/admin/settings).
  }
}
