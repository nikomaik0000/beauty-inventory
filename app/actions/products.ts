"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteProductImageServer } from "@/lib/product-images-server";
import { productSchema, type ProductFormValues } from "@/lib/validations";

/** Finds a brand by name (case-insensitive) or creates it: only brands
 * actually in use appear anywhere else in the app. */
export async function upsertBrandId(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create brand "${trimmed}": ${error.message}`);
  return created.id;
}

function toDbRow(values: ProductFormValues, brandId: string | null) {
  return {
    name: values.name.trim(),
    brand_id: brandId,
    category_id: values.category_id,
    subcategory_id: values.subcategory_id || null,
    image_url: values.image_url || null,
    expiration_type: values.expiration_type,
    expiration_date: values.expiration_type === "dated" ? values.expiration_date || null : null,
    opened: values.opened,
    opened_date: values.opened ? values.opened_date || null : null,
    pao_months: values.pao_months === "" || values.pao_months == null ? null : Number(values.pao_months),
    capacity: values.capacity === "" || values.capacity == null ? null : Number(values.capacity),
    quantity: values.quantity,
    notes: values.notes || null,
  };
}

export async function createProduct(raw: ProductFormValues) {
  const values = productSchema.parse(raw);
  const brandId = await upsertBrandId(values.brand_name ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(toDbRow(values, brandId));
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

/** Image replacement is deliberately sequenced as: save the DB row
 * first, and only delete the *old* Storage object once that write has
 * actually succeeded — not before. Deleting the old image first (as a
 * literal "delete then upload" flow would) risks leaving a product with
 * no image at all if the new upload or the DB write then fails; doing
 * it this way, the worst case is a harmless orphaned file, which the
 * Storage Maintenance tool (/admin/settings) cleans up. */
export async function updateProduct(id: string, raw: ProductFormValues) {
  const values = productSchema.parse(raw);
  const brandId = await upsertBrandId(values.brand_name ?? "");

  const supabase = await createClient();

  const { data: existing } = await supabase.from("products").select("image_url").eq("id", id).maybeSingle();

  const { error } = await supabase.from("products").update(toDbRow(values, brandId)).eq("id", id);
  if (error) throw new Error(error.message);

  const newImageUrl = values.image_url || null;
  if (existing?.image_url && existing.image_url !== newImageUrl) {
    await deleteProductImageServer(supabase, existing.image_url);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("products").select("image_url").eq("id", id).maybeSingle();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Delete the DB record first: that's the part the person is actually
  // waiting on. Storage cleanup afterward is best-effort — see
  // deleteProductImageServer.
  await deleteProductImageServer(supabase, existing?.image_url);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function toggleOpened(id: string, opened: boolean, openedDate: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ opened, opened_date: opened ? openedDate ?? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
