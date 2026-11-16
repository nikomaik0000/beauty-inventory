"use server";

import { revalidatePath } from "next/cache";
import { extractStoragePath, PRODUCT_IMAGE_BUCKET } from "@/lib/product-images-server";
import { requireInventoryUser } from "@/lib/inventory-auth";

export interface OrphanedImage {
  path: string;
  sizeBytes: number | null;
}

type InventoryClient = Awaited<ReturnType<typeof requireInventoryUser>>["supabase"];

async function referencedImagePaths(supabase: InventoryClient): Promise<Set<string>> {
  const [{ data: products, error: productsError }, { data: backupRows, error: backupError }] = await Promise.all([
    supabase.from("products").select("image_url"),
    supabase.rpc("inventory_referenced_image_paths"),
  ]);
  if (productsError) throw new Error("無法確認目前商品圖片引用，已停止圖片清理。");

  const paths = new Set(
    (products ?? []).map((p) => extractStoragePath(p.image_url)).filter((path): path is string => !!path),
  );
  if (backupError) {
    throw new Error("Phase 3B 圖片引用檢查尚未可用，為保護備份圖片已停止清理。");
  }
  for (const row of (backupRows ?? []) as Array<{ path: string | null }>) if (row.path) paths.add(row.path);
  return paths;
}

/** Lists every file actually in the bucket (both the current
 * `products/` folder convention and any legacy root-level files from
 * before short filenames were introduced), compares against every
 * `image_url` currently referenced by a product, and returns whatever
 * isn't referenced by anything. Nothing is deleted here — this is a
 * read-only scan; see deleteOrphanedImages for the actual cleanup. */
export async function findOrphanedImages(): Promise<OrphanedImage[]> {
  const { supabase } = await requireInventoryUser();

  const [{ data: rootEntries }, { data: productsEntries }, referencedPaths] = await Promise.all([
    supabase.storage.from(PRODUCT_IMAGE_BUCKET).list("", { limit: 1000 }),
    supabase.storage.from(PRODUCT_IMAGE_BUCKET).list("products", { limit: 1000 }),
    referencedImagePaths(supabase),
  ]);

  const allFiles: OrphanedImage[] = [];

  // Root-level entries: real files have metadata; the "products"
  // pseudo-folder entry (and any other folder) does not — skip those.
  for (const entry of rootEntries ?? []) {
    if (entry.id && entry.metadata) {
      allFiles.push({ path: entry.name, sizeBytes: entry.metadata.size ?? null });
    }
  }
  for (const entry of productsEntries ?? []) {
    if (entry.id && entry.metadata) {
      allFiles.push({ path: `products/${entry.name}`, sizeBytes: entry.metadata.size ?? null });
    }
  }

  return allFiles.filter((f) => !referencedPaths.has(f.path));
}

/** Deletes exactly the paths passed in — always call findOrphanedImages
 * first and let the person confirm; this never re-derives "what's
 * orphaned" itself, so there's no risk of a race between scan and
 * delete silently removing something that became referenced in
 * between. */
export async function deleteOrphanedImages(paths: string[]): Promise<{ deleted: number }> {
  const { supabase } = await requireInventoryUser();
  if (paths.length === 0) return { deleted: 0 };
  const referencedPaths = await referencedImagePaths(supabase);
  if (paths.some((path) => referencedPaths.has(path))) {
    throw new Error("選取的圖片仍被商品或保留中的備份引用，未刪除任何檔案。");
  }
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  return { deleted: paths.length };
}
