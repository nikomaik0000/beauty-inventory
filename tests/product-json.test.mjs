import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PRODUCT_JSON_FORMAT,
  PRODUCT_JSON_VERSION,
  buildProductJsonDocument,
  previewProductJson,
} from "../lib/product-json.ts";

const PRODUCT_ID = "10000000-0000-4000-8000-000000000001";
const NEW_ID = "10000000-0000-4000-8000-000000000002";
const BRAND_ID = "20000000-0000-4000-8000-000000000001";
const CATEGORY_ID = "30000000-0000-4000-8000-000000000001";

function product(overrides = {}) {
  return {
    id: PRODUCT_ID,
    name: "玫瑰化妝水",
    brand_id: BRAND_ID,
    category_id: CATEGORY_ID,
    subcategory_id: null,
    image_url: "https://example.supabase.co/storage/v1/object/public/product-images/products/rose.webp?token=secret",
    expiration_type: "dated",
    expiration_date: "2028-12-31",
    opened: false,
    opened_date: null,
    pao_months: 12,
    capacity: 100,
    quantity: 2,
    notes: "玫瑰香味",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    brand: { id: BRAND_ID, name: "範例品牌", created_at: "2026-01-01T00:00:00.000Z" },
    category: { id: CATEGORY_ID, name: "保養", sort_order: 1, created_at: "2026-01-01T00:00:00.000Z" },
    subcategory: null,
    ...overrides,
  };
}

function jsonFor(products) {
  return JSON.stringify({
    format: PRODUCT_JSON_FORMAT,
    version: PRODUCT_JSON_VERSION,
    exportedAt: "2026-11-16T00:00:00.000Z",
    products,
  });
}

test("versioned export keeps all product fields but emits only the image object path", () => {
  const document = buildProductJsonDocument([product()], "2026-11-16T00:00:00.000Z");
  assert.equal(document.format, PRODUCT_JSON_FORMAT);
  assert.equal(document.version, 1);
  assert.equal(document.products[0].id, PRODUCT_ID);
  assert.equal(document.products[0].brand.name, "範例品牌");
  assert.equal(document.products[0].quantity, 2);
  assert.equal(document.products[0].paoMonths, 12);
  assert.equal(document.products[0].legacy.opened, false);
  assert.equal(document.products[0].image.storagePath, "products/rose.webp");
  assert.doesNotMatch(JSON.stringify(document), /token=|storage\/v1\/object/);
});

test("export then update preview recognizes an identical product", () => {
  const current = product();
  const raw = JSON.stringify(buildProductJsonDocument([current], "2026-11-16T00:00:00.000Z"));
  const result = previewProductJson(raw, "update", [current]);
  assert.equal(result.valid, true);
  assert.equal(result.counts.unchanged, 1);
  assert.equal(result.counts.update, 0);
  assert.deepEqual(result.items[0].changes, []);
});

test("UUID update reports field-by-field changes", () => {
  const record = buildProductJsonDocument([product()]).products[0];
  record.quantity = 5;
  record.notes = "新備註";
  const result = previewProductJson(jsonFor([record]), "update", [product()]);
  assert.equal(result.valid, true);
  assert.equal(result.counts.update, 1);
  assert.deepEqual(result.items[0].changes.map((change) => change.field), ["quantity", "notes"]);
});

test("add mode accepts a new UUID but never overwrites a similar existing name", () => {
  const record = buildProductJsonDocument([product()]).products[0];
  record.id = NEW_ID;
  const conflict = previewProductJson(jsonFor([record]), "add", [product()]);
  assert.equal(conflict.counts.conflict, 1);
  assert.equal(conflict.items[0].suggestedMatches.length, 1);

  record.name = "全新乳霜";
  const added = previewProductJson(jsonFor([record]), "add", [product()]);
  assert.equal(added.counts.new, 1);
});

test("missing and unknown UUIDs require manual handling in update mode", () => {
  const record = buildProductJsonDocument([product()]).products[0];
  record.id = null;
  let result = previewProductJson(jsonFor([record]), "update", [product()]);
  assert.equal(result.valid, true);
  assert.equal(result.counts.conflict, 1);

  record.id = NEW_ID;
  result = previewProductJson(jsonFor([record]), "update", [product()]);
  assert.equal(result.counts.conflict, 1);
  assert.match(result.items[0].message, /找不到此 UUID/);
});

test("replace preview lists existing products absent from JSON as deletions", () => {
  const result = previewProductJson(jsonFor([]), "replace", [product()]);
  assert.equal(result.valid, true);
  assert.equal(result.counts.delete, 1);
  assert.equal(result.items[0].status, "delete");
});

test("unsupported versions, invalid dates and quantities never produce a valid preview", () => {
  const record = buildProductJsonDocument([product()]).products[0];
  record.quantity = -1;
  record.expiration.date = "2028-02-31";
  const raw = JSON.parse(jsonFor([record]));
  raw.version = 99;
  const result = previewProductJson(JSON.stringify(raw), "add", []);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("版本")));
  assert.ok(result.errors.some((error) => error.includes("quantity")));
  assert.ok(result.errors.some((error) => error.includes("expiration.date")));
  assert.equal(result.items.length, 0);
});

test("duplicate UUIDs are rejected", () => {
  const record = buildProductJsonDocument([product()]).products[0];
  const result = previewProductJson(jsonFor([record, { ...record }]), "replace", [product()]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("重複")));
});

test("image references reject URLs, traversal and query tokens", () => {
  const record = buildProductJsonDocument([product()]).products[0];
  record.image.storagePath = "products/rose.webp?token=secret";
  const result = previewProductJson(jsonFor([record]), "add", []);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("image.storagePath")));
});

test("update mode distinguishes omitted fields from explicit null", () => {
  const current = product();
  const omitted = previewProductJson(jsonFor([{ id: PRODUCT_ID, quantity: 3 }]), "update", [current]);
  assert.equal(omitted.valid, true);
  assert.deepEqual(omitted.items[0].changes.map((change) => change.field), ["quantity"]);

  const explicitNull = previewProductJson(jsonFor([{ id: PRODUCT_ID, notes: null }]), "update", [current]);
  assert.equal(explicitNull.valid, true);
  assert.deepEqual(explicitNull.items[0].changes.map((change) => change.field), ["notes"]);
  assert.equal(explicitNull.items[0].changes[0].after, "—");
});

test("add mode can generate a UUID when no likely duplicate exists", () => {
  const record = buildProductJsonDocument([product({ name: "獨特新品" })]).products[0];
  record.id = null;
  const result = previewProductJson(jsonFor([record]), "add", [product()]);
  assert.equal(result.valid, true);
  assert.equal(result.counts.new, 1);
  assert.match(result.items[0].message, /產生新 UUID/);
});

test("a 28-product export round trip remains entirely unchanged", () => {
  const products = Array.from({ length: 28 }, (_, index) => product({
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name: `商品 ${index + 1}`,
  }));
  const raw = JSON.stringify(buildProductJsonDocument(products, "2026-11-16T00:00:00.000Z"));
  const result = previewProductJson(raw, "update", products);
  assert.equal(result.valid, true);
  assert.equal(result.counts.unchanged, 28);
  assert.equal(result.counts.new + result.counts.update + result.counts.delete + result.counts.conflict + result.counts.error, 0);
});

test("server actions authorize reads and do not perform direct table mutation", async () => {
  const action = await readFile(new URL("../app/actions/product-json.ts", import.meta.url), "utf8");
  const settings = await readFile(new URL("../app/admin/settings/page.tsx", import.meta.url), "utf8");
  const exportBody = action.match(/export async function exportProductsJson[\s\S]*?\n}/)?.[0] ?? "";
  const previewBody = action.match(/export async function previewProductsJson[\s\S]*?\n}/)?.[0] ?? "";
  assert.ok((action.match(/await requireInventoryUser\(\)/g) ?? []).length >= 6);
  assert.ok(exportBody.indexOf("await requireInventoryUser()") < exportBody.indexOf("loadAllProducts"));
  assert.ok(previewBody.indexOf("await requireInventoryUser()") < previewBody.indexOf("rawText.length"));
  assert.ok(previewBody.indexOf("await requireInventoryUser()") < previewBody.indexOf("loadAllProducts"));
  assert.doesNotMatch(action, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.match(settings, /JsonDataManager/);
});
