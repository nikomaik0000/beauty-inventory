"use server";

import { revalidatePath } from "next/cache";
import { upsertBrandIdWithClient } from "@/lib/brands-server";
import { requireInventoryUser } from "@/lib/inventory-auth";
import { deleteProductImageServer } from "@/lib/product-images-server";
import { productSchema, quantityAdjustmentSchema, type ProductFormValues } from "@/lib/validations";

export interface ProductSaveTimings {
  authMs: number;
  validationMs: number;
  productLookupMs: number;
  brandResolutionMs: number;
  databaseWriteMs: number;
  imageCleanupMs: number;
  totalMs: number;
}

export interface ProductSaveResult {
  timings: ProductSaveTimings;
  imageChanged: boolean;
}

function millisecondsSince(startedAt: number) {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function reportSaveTimings(operation: "create" | "update", result: ProductSaveResult) {
  console.info("[product-save:server]", { operation, ...result });
  return result;
}

function parseProductValues(raw: ProductFormValues): ProductFormValues {
  const result = productSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues[0]?.message ?? "表單資料格式不正確。";
    throw new Error(`無法儲存：${detail}`);
  }
  return result.data;
}

/** Finds a brand by name (case-insensitive) or creates it: only brands
 * actually in use appear anywhere else in the app. */
export async function upsertBrandId(name: string): Promise<string | null> {
  const { supabase } = await requireInventoryUser();
  return upsertBrandIdWithClient(supabase, name);
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
    pao_months: values.pao_months === "" || values.pao_months == null ? null : Number(values.pao_months),
    capacity: values.capacity === "" || values.capacity == null ? null : Number(values.capacity),
    quantity: values.quantity,
    notes: values.notes || null,
  };
}

export async function createProduct(raw: ProductFormValues): Promise<ProductSaveResult> {
  const totalStartedAt = performance.now();
  const authStartedAt = performance.now();
  const { supabase } = await requireInventoryUser();
  const authMs = millisecondsSince(authStartedAt);
  const validationStartedAt = performance.now();
  const values = parseProductValues(raw);
  const validationMs = millisecondsSince(validationStartedAt);
  const brandStartedAt = performance.now();
  const brandId = await upsertBrandIdWithClient(supabase, values.brand_name ?? "");
  const brandResolutionMs = millisecondsSince(brandStartedAt);

  const writeStartedAt = performance.now();
  const { error } = await supabase.from("products").insert({
    ...toDbRow(values, brandId),
    opened: false,
    opened_date: null,
  });
  if (error) throw new Error(`新增商品失敗：${error.message}`);
  const databaseWriteMs = millisecondsSince(writeStartedAt);

  return reportSaveTimings("create", {
    imageChanged: Boolean(values.image_url),
    timings: {
      authMs,
      validationMs,
      productLookupMs: 0,
      brandResolutionMs,
      databaseWriteMs,
      imageCleanupMs: 0,
      totalMs: millisecondsSince(totalStartedAt),
    },
  });
}

async function deleteImageIfUnreferenced(
  supabase: Awaited<ReturnType<typeof requireInventoryUser>>["supabase"],
  imageUrl: string | null | undefined,
) {
  if (!imageUrl) return;

  const { data: reference } = await supabase
    .from("products")
    .select("id")
    .eq("image_url", imageUrl)
    .limit(1)
    .maybeSingle();

  if (!reference) await deleteProductImageServer(supabase, imageUrl);
}

/** Image replacement is deliberately sequenced as: save the DB row
 * first, and only delete the *old* Storage object once that write has
 * actually succeeded — not before. Deleting the old image first (as a
 * literal "delete then upload" flow would) risks leaving a product with
 * no image at all if the new upload or the DB write then fails; doing
 * it this way, the worst case is a harmless orphaned file, which the
 * Storage Maintenance tool (/admin/settings) cleans up. */
export async function updateProduct(id: string, raw: ProductFormValues): Promise<ProductSaveResult> {
  const totalStartedAt = performance.now();
  const authStartedAt = performance.now();
  const { supabase } = await requireInventoryUser();
  const authMs = millisecondsSince(authStartedAt);
  const validationStartedAt = performance.now();
  const values = parseProductValues(raw);
  const validationMs = millisecondsSince(validationStartedAt);

  const lookupStartedAt = performance.now();
  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("image_url, brand_id, brand:brands(name)")
    .eq("id", id)
    .maybeSingle();
  if (existingError) throw new Error(`讀取商品失敗：${existingError.message}`);
  if (!existing) throw new Error("找不到要編輯的商品，請重新整理後再試一次。");
  const productLookupMs = millisecondsSince(lookupStartedAt);

  const requestedBrandName = (values.brand_name ?? "").trim();
  const existingBrand = Array.isArray(existing.brand) ? existing.brand[0] : existing.brand;
  const existingBrandName = existingBrand?.name?.trim() ?? "";
  const brandStartedAt = performance.now();
  const brandId = !requestedBrandName
    ? null
    : existing.brand_id &&
        existingBrandName.toLocaleLowerCase() === requestedBrandName.toLocaleLowerCase()
      ? existing.brand_id
      : await upsertBrandIdWithClient(supabase, requestedBrandName);
  const brandResolutionMs = millisecondsSince(brandStartedAt);

  const writeStartedAt = performance.now();
  const { data: updated, error } = await supabase
    .from("products")
    .update(toDbRow(values, brandId))
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`儲存商品失敗：${error.message}`);
  if (!updated) throw new Error("商品未更新，請確認登入狀態後再試一次。");
  const databaseWriteMs = millisecondsSince(writeStartedAt);

  const newImageUrl = values.image_url || null;
  const imageChanged = (existing.image_url ?? null) !== newImageUrl;
  const imageCleanupStartedAt = performance.now();
  if (existing.image_url && imageChanged) {
    await deleteImageIfUnreferenced(supabase, existing.image_url);
  }
  const imageCleanupMs = millisecondsSince(imageCleanupStartedAt);

  return reportSaveTimings("update", {
    imageChanged,
    timings: {
      authMs,
      validationMs,
      productLookupMs,
      brandResolutionMs,
      databaseWriteMs,
      imageCleanupMs,
      totalMs: millisecondsSince(totalStartedAt),
    },
  });
}

export async function deleteProduct(id: string) {
  const { supabase } = await requireInventoryUser();

  const { data: existing } = await supabase.from("products").select("image_url").eq("id", id).maybeSingle();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Delete the DB record first: that's the part the person is actually
  // waiting on. Storage cleanup afterward is best-effort — see
  // deleteProductImageServer.
  await deleteImageIfUnreferenced(supabase, existing?.image_url);

  revalidatePath("/");
  revalidatePath("/admin");
}

/**
 * Uses the Phase 2 database RPC draft so concurrent clicks/tabs update
 * `quantity = quantity + delta` in one statement instead of overwriting a
 * stale value. Until that draft is deployed, this action fails closed with a
 * clear message and the detail dialog leaves the persisted quantity unchanged.
 */
export async function adjustProductQuantity(productId: string, delta: -1 | 1): Promise<number> {
  const { supabase } = await requireInventoryUser();
  const input = quantityAdjustmentSchema.parse({ productId, delta });
  const { data, error } = await supabase.rpc("adjust_product_quantity", {
    product_id: input.productId,
    quantity_delta: input.delta,
  });

  if (error) {
    if (error.code === "PGRST202" || error.message.includes("adjust_product_quantity")) {
      throw new Error("快速庫存尚未啟用，請先套用並驗證 Phase 2 原子庫存 migration。");
    }
    throw new Error(error.message);
  }

  const quantity = Number(data);
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("庫存更新回傳了無效結果，請重新整理後再試一次。");
  }

  revalidatePath("/");
  return quantity;
}
