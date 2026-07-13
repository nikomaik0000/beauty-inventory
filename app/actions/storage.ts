"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractStoragePath, PRODUCT_IMAGE_BUCKET } from "@/lib/product-images-server";

export interface OrphanedImage {
  path: string;
  sizeBytes: number | null;
}

/** Lists every file actually in the bucket (both the current
 * `products/` folder convention and any legacy root-level files from
 * before short filenames were introduced), compares against every
 * `image_url` currently referenced by a product, and returns whatever
 * isn't referenced by anything. Nothing is deleted here — this is a
 * read-only scan; see deleteOrphanedImages for the actual cleanup. */
export async function findOrphanedImages(): Promise<OrphanedImage[]> {
  const supabase = await createClient();

  const [{ data: rootEntries }, { data: productsEntries }, { data: products }] = await Promise.all([
    supabase.storage.from(PRODUCT_IMAGE_BUCKET).list("", { limit: 1000 }),
    supabase.storage.from(PRODUCT_IMAGE_BUCKET).list("products", { limit: 1000 }),
    supabase.from("products").select("image_url"),
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

  const referencedPaths = new Set(
    (products ?? [])
      .map((p) => extractStoragePath(p.image_url))
      .filter((path): path is string => !!path),
  );

  return allFiles.filter((f) => !referencedPaths.has(f.path));
}

/** Deletes exactly the paths passed in — always call findOrphanedImages
 * first and let the person confirm; this never re-derives "what's
 * orphaned" itself, so there's no risk of a race between scan and
 * delete silently removing something that became referenced in
 * between. */
export async function deleteOrphanedImages(paths: string[]): Promise<{ deleted: number }> {
  if (paths.length === 0) return { deleted: 0 };

  const supabase = await createClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  return { deleted: paths.length };
}
