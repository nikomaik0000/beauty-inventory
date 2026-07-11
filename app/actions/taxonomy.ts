"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema, subcategorySchema } from "@/lib/validations";

// --- Categories ---------------------------------------------------------

export async function createCategory(name: string) {
  const values = categorySchema.parse({ name });
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name: values.name.trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function renameCategory(id: string, name: string) {
  const values = categorySchema.parse({ name });
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ name: values.name.trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

// --- Subcategories -------------------------------------------------------

export async function createSubcategory(categoryId: string, name: string) {
  const values = subcategorySchema.parse({ category_id: categoryId, name });
  const supabase = await createClient();
  const { error } = await supabase
    .from("subcategories")
    .insert({ category_id: values.category_id, name: values.name.trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function renameSubcategory(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subcategories").update({ name: name.trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function deleteSubcategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subcategories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

// --- Brands ---------------------------------------------------------------

export async function renameBrand(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("brands").update({ name: name.trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/brands");
  revalidatePath("/");
}

export async function deleteBrand(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/brands");
  revalidatePath("/");
}

// --- Tags -------------------------------------------------------------

export async function renameTag(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").update({ name: name.trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/tags");
  revalidatePath("/");
}

export async function deleteTag(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/tags");
  revalidatePath("/");
}
