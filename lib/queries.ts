import { createClient } from "@/lib/supabase/server";
import type { Brand, Category, ProductWithRelations, Subcategory, Tag } from "@/lib/types";

/** Fetches every product with its brand/category/subcategory/tags joined.
 * Filtering, sorting, and search all happen client-side against this
 * full set, which keeps the filter panel instant for a personal-scale
 * inventory (hundreds, not tens of thousands, of items). */
export async function getProductsWithRelations(): Promise<ProductWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `*, brand:brands(*), category:categories(*), subcategory:subcategories(*),
       product_tags(tag:tags(*))`,
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    ...row,
    tags: (row.product_tags ?? []).map((pt: any) => pt.tag).filter(Boolean) as Tag[],
  }));
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

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `*, brand:brands(*), category:categories(*), subcategory:subcategories(*),
       product_tags(tag:tags(*))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as any;
  return { ...row, tags: (row.product_tags ?? []).map((pt: any) => pt.tag).filter(Boolean) as Tag[] };
}

/** Brands/tags that only ever surface in filters if a product actually
 * uses them — computed from the loaded product set rather than the raw
 * brands/tags tables, so a brand created but not yet assigned doesn't
 * clutter the filter panel. */
export function usedBrands(products: ProductWithRelations[]): Brand[] {
  const map = new Map<string, Brand>();
  for (const p of products) if (p.brand) map.set(p.brand.id, p.brand);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function usedTags(products: ProductWithRelations[]): Tag[] {
  const map = new Map<string, Tag>();
  for (const p of products) for (const t of p.tags) map.set(t.id, t);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
