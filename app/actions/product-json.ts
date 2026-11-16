"use server";

import { requireInventoryUser } from "@/lib/inventory-auth";
import {
  buildProductJsonDocument,
  previewProductJson,
  type JsonImportMode,
  type JsonPreviewResult,
} from "@/lib/product-json";
import type { ProductWithRelations } from "@/lib/types";

type InventoryClient = Awaited<ReturnType<typeof requireInventoryUser>>["supabase"];

async function loadAllProducts(supabase: InventoryClient) {
  const { data, error } = await supabase
    .from("products")
    .select("*, brand:brands(*), category:categories(*), subcategory:subcategories(*)")
    .order("created_at", { ascending: false });

  if (error) throw new Error("無法讀取商品資料，請稍後再試。");
  return (data ?? []) as ProductWithRelations[];
}

/** Authorized, filter-independent export. This returns JSON data only;
 * product image binaries are intentionally not downloaded or embedded. */
export async function exportProductsJson(): Promise<string> {
  const { supabase } = await requireInventoryUser();
  const products = await loadAllProducts(supabase);
  return JSON.stringify(buildProductJsonDocument(products), null, 2);
}

/** Phase 3A is preview-only. It deliberately exposes no mutation path. */
export async function previewProductsJson(rawText: string, mode: JsonImportMode): Promise<JsonPreviewResult> {
  const { supabase } = await requireInventoryUser();
  if (typeof rawText !== "string" || rawText.length > 5_000_000) {
    return previewProductJson("", mode, []);
  }
  const products = await loadAllProducts(supabase);
  return previewProductJson(rawText, mode, products);
}
