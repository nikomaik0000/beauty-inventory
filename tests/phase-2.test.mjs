import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("atomic stock draft increments in the database and cannot cross zero", async () => {
  const [sql, rollback] = await Promise.all([
    source("../supabase/phase-2-atomic-inventory.DRAFT.sql"),
    source("../supabase/phase-2-atomic-inventory-rollback.DRAFT.sql"),
  ]);
  const executable = sql.replace(/--[^\n]*/g, "");
  const rollbackExecutable = rollback.replace(/--[^\n]*/g, "");

  assert.match(sql, /security invoker/i);
  assert.match(sql, /adjust_product_quantity\(uuid,integer\).*already exists/is);
  assert.match(sql, /products_quantity_nonnegative.*already exists/is);
  assert.doesNotMatch(sql, /create\s+or\s+replace\s+function/i);
  assert.match(sql, /set quantity = quantity \+ quantity_delta/i);
  assert.match(sql, /quantity \+ quantity_delta >= 0/i);
  assert.match(sql, /check \(quantity >= 0\)/i);
  assert.match(sql, /beauty-inventory:phase-2:products_quantity_nonnegative:v1/i);
  assert.match(sql, /beauty-inventory:phase-2:adjust_product_quantity:v1/i);
  assert.match(sql, /revoke all .* from public, anon/i);
  assert.match(sql, /grant execute .* to authenticated/i);
  assert.match(executable, /rollback;\s*$/i);
  assert.doesNotMatch(executable, /\bcommit\s*;/i);

  assert.match(rollback, /obj_description\(constraint_oid, 'pg_constraint'\) is distinct from/i);
  assert.match(rollback, /obj_description\(function_object\.oid, 'pg_proc'\)/i);
  assert.match(rollback, /drop function public\.adjust_product_quantity\(uuid, integer\)/i);
  assert.match(rollback, /drop constraint products_quantity_nonnegative/i);
  assert.doesNotMatch(rollbackExecutable, /\b(update|insert|delete)\s+(?:from|into\s+)?public\.products\b/i);
  assert.match(rollbackExecutable, /rollback;\s*$/i);
  assert.doesNotMatch(rollbackExecutable, /\bcommit\s*;/i);
});

test("quick stock action requires the shared allowlist guard before RPC", async () => {
  const actions = await source("../app/actions/products.ts");
  const functionBody = actions.slice(actions.indexOf("export async function adjustProductQuantity"));

  assert.ok(functionBody.indexOf("requireInventoryUser()") >= 0);
  assert.ok(functionBody.indexOf("requireInventoryUser()") < functionBody.indexOf('.rpc("adjust_product_quantity"'));
  assert.match(functionBody, /quantityAdjustmentSchema\.parse/);
});

test("Phase 2 removes opened controls while preserving the database fields elsewhere", async () => {
  const [form, filters, explorer, csv] = await Promise.all([
    source("../components/admin/product-form.tsx"),
    source("../components/filter-panel.tsx"),
    source("../components/product-explorer.tsx"),
    source("../lib/csv-import.ts"),
  ]);

  assert.doesNotMatch(form, /register\("opened"\)|opened_date/);
  assert.doesNotMatch(filters, /開封狀態|openedStatus/);
  assert.doesNotMatch(explorer, /openedStatus/);
  assert.match(csv, /opened/);
});

test("integrated routes and mobile navigation use the main product page", async () => {
  const [adminPage, navigation] = await Promise.all([
    source("../app/admin/page.tsx"),
    source("../components/mobile-bottom-nav.tsx"),
  ]);

  assert.match(adminPage, /redirect\("\/"\)/);
  for (const href of ['href: "/"', 'href: "/admin/categories"', 'href: "/admin/brands"', 'href: "/admin/settings"']) {
    assert.match(navigation, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(navigation, /safe-area-inset-bottom/);
  assert.match(navigation, /visualViewport/);
});
