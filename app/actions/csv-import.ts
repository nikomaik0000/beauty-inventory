"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { upsertBrandId } from "@/app/actions/products";
import type { ValidImportRow } from "@/lib/csv-import";

export interface ImportSummary {
  created: number;
  updated: number;
  failed: number;
  errors: { rowNumber: number; message: string }[];
}

/** Imports already-validated rows (see `parseAndValidateProductCsv`).
 * Matching, updating vs. creating, and which fields get touched all
 * follow the same rules as the client-side preview — this just does
 * the actual writes. Images are never created, replaced, or deleted
 * here; that stays entirely on the existing upload flow. */
export async function importProductRows(rows: ValidImportRow[]): Promise<ImportSummary> {
  const supabase = await createClient();
  const summary: ImportSummary = { created: 0, updated: 0, failed: 0, errors: [] };

  for (const row of rows) {
    try {
      const brandId = await upsertBrandId(row.brandName);

      if (row.matchedProductId) {
        // Matched product: only update the fields this feature owns.
        // Subcategory, PAO months, and the image are left untouched.
        const { data: existing, error: fetchError } = await supabase
          .from("products")
          .select("opened, opened_date")
          .eq("id", row.matchedProductId)
          .maybeSingle();
        if (fetchError) throw new Error(fetchError.message);

        const openedDate = row.opened
          ? existing?.opened && existing.opened_date
            ? existing.opened_date
            : new Date().toISOString().slice(0, 10)
          : null;

        const { error } = await supabase
          .from("products")
          .update({
            brand_id: brandId,
            category_id: row.categoryId,
            capacity: row.capacity,
            quantity: row.quantity,
            expiration_type: row.expirationType,
            expiration_date: row.expirationType === "dated" ? row.expirationDate : null,
            opened: row.opened,
            opened_date: openedDate,
            notes: row.notes,
          })
          .eq("id", row.matchedProductId);
        if (error) throw new Error(error.message);
        summary.updated += 1;
      } else {
        const openedDate = row.opened ? new Date().toISOString().slice(0, 10) : null;
        const { error } = await supabase.from("products").insert({
          name: row.name,
          brand_id: brandId,
          category_id: row.categoryId,
          subcategory_id: null,
          image_url: null,
          capacity: row.capacity,
          quantity: row.quantity,
          expiration_type: row.expirationType,
          expiration_date: row.expirationType === "dated" ? row.expirationDate : null,
          opened: row.opened,
          opened_date: openedDate,
          notes: row.notes,
        });
        if (error) throw new Error(error.message);
        summary.created += 1;
      }
    } catch (err) {
      summary.failed += 1;
      summary.errors.push({
        rowNumber: row.rowNumber,
        message: err instanceof Error ? err.message : "資料庫錯誤",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return summary;
}
