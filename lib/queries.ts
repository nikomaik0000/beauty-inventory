import { createClient } from "@/lib/supabase/server";
import type { Brand, Category, ProductWithRelations, Subcategory } from "@/lib/types";

/** Fetches every product with its brand/category/subcategory joined.
 * Filtering, sorting, and search all happen client-side against this
 * full set, which keeps the filter panel instant for a personal-scale
 * inventory (hundreds, not tens of thousands, of items). */
export async function getProductsWithRelations(): Promise<ProductWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`*, brand:brands(*), category:categories(*), subcategory:subcategories(*)`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductWithRelations[];
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSubcategories(): Promise<Subcategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subcategories").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("brands").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(`*, brand:brands(*), category:categories(*), subcategory:subcategories(*)`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProductWithRelations | null) ?? null;
}

/** Brands that only ever surface in the filter panel if a product
 * actually uses them — computed from the loaded product set rather than
 * the raw brands table, so a brand created but not yet assigned doesn't
 * clutter the filter. */
export function usedBrands(products: ProductWithRelations[]): Brand[] {
  const map = new Map<string, Brand>();
  for (const p of products) if (p.brand) map.set(p.brand.id, p.brand);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
