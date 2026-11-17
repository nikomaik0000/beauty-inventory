import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Phase 3B import RPC binds preview to user, expiry, state and idempotency", async () => {
  const sql = await source("../supabase/phase-3b-json-import-backup.DRAFT.sql");
  assert.match(sql, /inventory_json_previews/);
  assert.match(sql, /expires_at timestamptz not null default \(now\(\) \+ interval '10 minutes'\)/);
  assert.match(sql, /v_preview\.user_id <> v_user/);
  assert.match(sql, /v_preview\.state_hash <> inventory_private\.current_product_state_hash\(\)/);
  assert.match(sql, /primary key \(user_id, idempotency_key\)/);
  assert.match(sql, /for update/);
  assert.match(sql, /already-applied/);
});

test("Phase 3B RPC takes a snapshot before mutation and preserves taxonomy tables", async () => {
  const sql = await source("../supabase/phase-3b-json-import-backup.DRAFT.sql");
  const commitStart = sql.indexOf("create or replace function public.commit_inventory_json_import");
  const commitEnd = sql.indexOf("create or replace function public.list_inventory_backups");
  const body = sql.slice(commitStart, commitEnd);
  assert.ok(body.indexOf("create_product_backup") < body.indexOf("insert into public.products"));
  assert.doesNotMatch(body, /delete from public\.(?:categories|subcategories|brands|tags)/);
  assert.match(body, /delete from public\.products/);
  assert.match(sql, /inventory_backup_product_tags/);
});

test("Phase 3B restore snapshots current state and restores atomically inside one RPC", async () => {
  const sql = await source("../supabase/phase-3b-json-import-backup.DRAFT.sql");
  const restoreStart = sql.indexOf("create or replace function public.commit_inventory_backup_restore");
  const restoreEnd = sql.indexOf("create or replace function public.inventory_referenced_image_paths");
  const body = sql.slice(restoreStart, restoreEnd);
  assert.ok(body.indexOf("create_product_backup('restore'") < body.indexOf("delete from public.products"));
  assert.match(body, /insert into public\.product_tags/);
  assert.match(body, /p_confirmation_text<>'RESTORE'/);
});

test("RPC execution is denied to anon and guarded by the database allowlist", async () => {
  const sql = await source("../supabase/phase-3b-json-import-backup.DRAFT.sql");
  assert.match(sql, /revoke all on function public\.commit_inventory_json_import\(uuid,uuid,text\) from public,anon,authenticated/);
  assert.match(sql, /grant execute on function public\.commit_inventory_json_import\(uuid,uuid,text\) to authenticated/);
  assert.match(sql, /inventory_private\.assert_inventory_user\(\)/);
  assert.match(sql, /not public\.is_inventory_user\(\)/);
});

test("backup image references are included in orphan protection and deletion rechecks references", async () => {
  const [sql, storage] = await Promise.all([
    source("../supabase/phase-3b-json-import-backup.DRAFT.sql"),
    source("../app/actions/storage.ts"),
  ]);
  assert.match(sql, /inventory_backup_products/);
  assert.match(sql, /inventory_referenced_image_paths/);
  assert.match(storage, /referencedImagePaths\(supabase\)/);
  assert.match(storage, /paths\.some\(\(path\) => referencedPaths\.has\(path\)\)/);
  assert.ok(storage.indexOf("referencedImagePaths(supabase)") < storage.indexOf(".remove(paths)"));
});

test("UI stays preview-only when the Phase 3B RPC is unavailable", async () => {
  const [actions, ui, backups] = await Promise.all([
    source("../app/actions/product-json.ts"),
    source("../components/admin/json-data-manager.tsx"),
    source("../components/admin/inventory-backup-manager.tsx"),
  ]);
  assert.match(actions, /Phase 3B RPC 尚未安裝；目前只能預覽，不能提交/);
  assert.doesNotMatch(actions, /\.from\("products"\)\.insert|\.from\("products"\)\.update|\.from\("products"\)\.delete/);
  assert.match(ui, /!result\.execution\?\.enabled/);
  assert.match(backups, /備份與還原維持停用，不會改用逐筆寫入/);
});

test("every Phase 3B Server Action uses the shared allowlist before RPC access", async () => {
  const actions = await source("../app/actions/product-json.ts");
  for (const functionName of [
    "commitProductsJsonImport",
    "listInventoryBackups",
    "prepareInventoryBackupRestore",
    "commitInventoryBackupRestore",
  ]) {
    const start = actions.indexOf(`export async function ${functionName}`);
    const next = actions.indexOf("\nexport async function ", start + 1);
    const body = actions.slice(start, next < 0 ? actions.length : next);
    assert.ok(body.indexOf("await requireInventoryUser()") >= 0, `${functionName} must require the allowlist`);
    assert.ok(body.indexOf("await requireInventoryUser()") < body.indexOf("supabase.rpc"), `${functionName} must authorize before RPC`);
  }
});

test("Phase 3B production artifacts fail closed and keep verification read-only", async () => {
  const [production, preflight, rollback, verification] = await Promise.all([
    source("../supabase/phase-3b-json-import-backup.PRODUCTION.sql"),
    source("../supabase/phase-3b-json-import-backup-preflight.READONLY.sql"),
    source("../supabase/phase-3b-json-import-backup-rollback.REVIEW.sql"),
    source("../supabase/phase-3b-json-import-backup-post-install.READONLY.sql"),
  ]);
  const productionExecutable = production.replace(/--[^\n]*/g, "");
  const preflightExecutable = preflight.replace(/--[^\n]*/g, "");
  const rollbackExecutable = rollback.replace(/--[^\n]*/g, "");
  const verificationExecutable = verification.replace(/--[^\n]*/g, "");

  assert.match(production, /phase-3b-json-import-backup/);
  assert.match(production, /Phase 1 allowlist is incomplete/);
  assert.match(production, /Phase 2 inventory objects are incomplete/);
  assert.match(production, /function % already exists/);
  assert.match(production, /table inventory_private\.% already exists/);
  assert.match(production, /phase3b_inventory_fingerprint/);
  assert.match(production, /phase3b_image_fingerprint/);
  assert.match(production, /unsupported JSON format or version/);
  assert.match(production, /already-applied/);
  assert.match(productionExecutable, /commit;\s*$/i);
  assert.doesNotMatch(production, /create table if not exists/i);
  assert.doesNotMatch(production, /create or replace function/i);

  assert.match(rollback, /permanently deletes all Phase 3B/i);
  assert.match(rollback, /missing or not owned/i);
  assert.match(rollbackExecutable, /rollback;\s*$/i);
  assert.doesNotMatch(rollbackExecutable, /commit;\s*$/i);

  for (const readonlySql of [preflightExecutable, verificationExecutable]) {
    const statementsOnly = readonlySql.replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(
      statementsOnly,
      /\b(begin|commit|rollback|create|alter|drop|grant|revoke|update|insert|delete)\b/i,
    );
  }
  assert.match(preflight, /phase_3b_function_names_available/);
  assert.match(preflight, /phase_3b_internal_table_names_available/);
  assert.match(verification, /public_rpc_execute_authenticated_only/);
  assert.match(verification, /five_internal_tables_marked_and_rls_enabled/);
  assert.match(verification, /inventory_fingerprint/);
  assert.match(verification, /image_path_fingerprint/);
  assert.doesNotMatch(
    preflight,
    /\bfrom\s+inventory_private\.inventory_(?:backups|backup_products|backup_product_tags|json_previews|import_batches)\b/i,
  );
  assert.doesNotMatch(
    verification,
    /\bfrom\s+inventory_private\.inventory_(?:backups|backup_products|backup_product_tags|json_previews|import_batches)\b/i,
  );
});
