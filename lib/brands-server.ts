import type { SupabaseClient } from "@supabase/supabase-js";

/** Finds a brand by name (case-insensitive) or creates it. */
export async function upsertBrandIdWithClient(
  supabase: SupabaseClient,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

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

