"use server";

import { revalidatePath } from "next/cache";
import { requireInventoryUser } from "@/lib/inventory-auth";
import type {
  InventoryBackupListResult,
  InventoryCommitResult,
  InventoryRestorePreview,
} from "@/lib/inventory-backup";
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

function isRpcUnavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" || /function .* does not exist|schema cache/i.test(error.message ?? "");
}

function disabledExecution(reason: string) {
  return { enabled: false, previewToken: null, expiresAt: null, dataVersion: null, reason };
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Authorized, filter-independent export. This returns JSON data only;
 * product image binaries are intentionally not downloaded or embedded. */
export async function exportProductsJson(): Promise<string> {
  const { supabase } = await requireInventoryUser();
  const products = await loadAllProducts(supabase);
  return JSON.stringify(buildProductJsonDocument(products), null, 2);
}

/** Builds the Phase 3A diff, then asks the Phase 3B RPC for a short-lived,
 * state-bound submission token. Missing RPCs leave the preview read-only. */
export async function previewProductsJson(
  rawText: string,
  mode: JsonImportMode,
  confirmedNewKeys: string[] = [],
): Promise<JsonPreviewResult> {
  const { supabase } = await requireInventoryUser();
  if (!["add", "update", "replace"].includes(mode)) {
    return { ...previewProductJson("", "add", []), execution: disabledExecution("匯入模式無效。") };
  }
  if (typeof rawText !== "string" || rawText.length > 5_000_000) {
    return { ...previewProductJson("", mode, []), execution: disabledExecution("JSON 超過允許大小或格式無效。") };
  }
  const products = await loadAllProducts(supabase);
  const preview = previewProductJson(rawText, mode, products, confirmedNewKeys);
  if (!preview.valid || preview.counts.conflict > 0 || preview.counts.error > 0) {
    return { ...preview, execution: disabledExecution("請先排除所有衝突與錯誤。") };
  }
  if (preview.counts.new + preview.counts.update + preview.counts.delete === 0) {
    return { ...preview, execution: disabledExecution("沒有需要寫入的差異。") };
  }

  const confirmedIndexes = preview.items
    .filter((item) => item.sourceIndex !== null && confirmedNewKeys.includes(item.key))
    .map((item) => item.sourceIndex as number);
  const { data, error } = await supabase.rpc("prepare_inventory_json_import", {
    p_document: JSON.parse(rawText),
    p_mode: mode,
    p_confirmed_new_indexes: confirmedIndexes,
  });
  if (error) {
    if (isRpcUnavailable(error)) {
      return { ...preview, execution: disabledExecution("Phase 3B RPC 尚未安裝；目前只能預覽，不能提交。") };
    }
    return {
      ...preview,
      valid: false,
      execution: disabledExecution("資料庫重新驗證未通過；請修正資料後重新預覽。"),
      errors: [...preview.errors, "資料庫重新驗證未通過，未建立提交憑證。"],
      counts: { ...preview.counts, error: preview.counts.error + 1 },
    };
  }
  const prepared = data as { preview_token?: string; expires_at?: string; data_version?: string } | null;
  return {
    ...preview,
    execution: {
      enabled: Boolean(prepared?.preview_token),
      previewToken: prepared?.preview_token ?? null,
      expiresAt: prepared?.expires_at ?? null,
      dataVersion: prepared?.data_version ?? null,
      reason: prepared?.preview_token ? null : "資料庫未回傳有效的 preview token。",
    },
  };
}

export async function commitProductsJsonImport(
  previewToken: string,
  idempotencyKey: string,
  confirmationText: string,
): Promise<InventoryCommitResult> {
  const { supabase } = await requireInventoryUser();
  if (!validUuid(previewToken) || !validUuid(idempotencyKey)) throw new Error("提交憑證格式無效，請重新預覽。");
  const { data, error } = await supabase.rpc("commit_inventory_json_import", {
    p_preview_token: previewToken,
    p_idempotency_key: idempotencyKey,
    p_confirmation_text: confirmationText,
  });
  if (error) {
    if (isRpcUnavailable(error)) throw new Error("Phase 3B RPC 尚未安裝，無法提交。");
    throw new Error("匯入失敗，資料庫已取消整批交易。請重新預覽後再試。");
  }
  revalidatePath("/");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/settings");
  return data as InventoryCommitResult;
}

export async function listInventoryBackups(): Promise<InventoryBackupListResult> {
  const { supabase } = await requireInventoryUser();
  const { data, error } = await supabase.rpc("list_inventory_backups");
  if (error) {
    if (isRpcUnavailable(error)) return { installed: false, reason: "Phase 3B RPC 尚未安裝。", backups: [] };
    return { installed: false, reason: "無法安全讀取備份清單。", backups: [] };
  }
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return {
    installed: true,
    reason: null,
    backups: rows.map((row) => ({
      id: String(row.id),
      createdAt: String(row.created_at),
      operation: row.operation as InventoryBackupListResult["backups"][number]["operation"],
      productCount: Number(row.product_count),
      affectedCount: Number(row.affected_count),
      imageReferenceCount: Number(row.image_reference_count),
    })),
  };
}

export async function prepareInventoryBackupRestore(backupId: string): Promise<InventoryRestorePreview> {
  const { supabase } = await requireInventoryUser();
  if (!validUuid(backupId)) throw new Error("備份識別碼無效。");
  const { data, error } = await supabase.rpc("prepare_inventory_backup_restore", { p_backup_id: backupId });
  if (error) {
    if (isRpcUnavailable(error)) throw new Error("Phase 3B RPC 尚未安裝，無法還原。");
    throw new Error("無法建立還原預覽；未進行任何資料異動。");
  }
  return data as InventoryRestorePreview;
}

export async function commitInventoryBackupRestore(
  previewToken: string,
  idempotencyKey: string,
  confirmationText: string,
): Promise<InventoryCommitResult> {
  const { supabase } = await requireInventoryUser();
  if (!validUuid(previewToken) || !validUuid(idempotencyKey)) throw new Error("還原憑證格式無效，請重新預覽。");
  const { data, error } = await supabase.rpc("commit_inventory_backup_restore", {
    p_preview_token: previewToken,
    p_idempotency_key: idempotencyKey,
    p_confirmation_text: confirmationText,
  });
  if (error) throw new Error("還原失敗，資料庫已取消整批交易。請重新預覽後再試。");
  revalidatePath("/");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/settings");
  return data as InventoryCommitResult;
}
