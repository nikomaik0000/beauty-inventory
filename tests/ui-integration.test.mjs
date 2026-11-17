import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("product create and edit share a centered modal while legacy routes stay compatible", async () => {
  const [explorer, modal, newRoute, editRoute] = await Promise.all([
    source("../components/product-explorer.tsx"),
    source("../components/admin/product-form-dialog.tsx"),
    source("../app/admin/products/new/page.tsx"),
    source("../app/admin/products/[id]/edit/page.tsx"),
  ]);
  assert.match(explorer, /PRODUCT_FORM_OPEN_EVENT/);
  assert.match(explorer, /setProductForm/);
  assert.match(modal, /max-w-\[720px\]/);
  assert.match(modal, /max-h-\[88dvh\]/);
  assert.match(modal, /animated=\{false\}/);
  assert.match(newRoute, /redirect/);
  assert.match(editRoute, /redirect/);
});

test("product images preview locally, support paste and crop, then defer upload until save", async () => {
  const [uploader, crop, form] = await Promise.all([
    source("../components/admin/image-uploader.tsx"),
    source("../components/admin/image-crop-dialog.tsx"),
    source("../components/admin/product-form.tsx"),
  ]);
  assert.match(uploader, /addEventListener\("paste"/);
  assert.match(uploader, /onDrop/);
  assert.match(uploader, /h-\[120px\] w-\[120px\]/);
  assert.match(uploader, /拖曳、貼上或選擇圖片/);
  assert.match(crop, /原比例/);
  assert.match(crop, /自由裁切/);
  assert.match(crop, /1:1 方形/);
  assert.match(crop, /frameClassName="z-\[60\]"/);
  assert.match(form, /optimizeImageForUpload\(pendingImage\)/);
  assert.match(form, /uploadProductImage\(optimized\)/);
});

test("product form surfaces client validation and server save failures", async () => {
  const [form, validations, actions] = await Promise.all([
    source("../components/admin/product-form.tsx"),
    source("../lib/validations.ts"),
    source("../app/actions/products.ts"),
  ]);

  assert.match(form, /<form\s+noValidate/);
  assert.match(form, /handleSubmit\(onSubmit, onInvalid\)/);
  assert.match(form, /role="alert"/);
  assert.match(form, /無法儲存/);
  for (const field of [
    "image_url",
    "brand_name",
    "quantity",
    "category_id",
    "subcategory_id",
    "capacity",
    "expiration_date",
    "pao_months",
    "notes",
  ]) {
    assert.match(form, new RegExp(`errors\\.${field}\\?\\.message`));
  }

  assert.match(validations, /extractProductImagePath\(value\) !== null/);
  assert.match(validations, /z\.literal\(""\),\s*z\.coerce/s);
  assert.match(validations, /value === "" \|\| value == null \? undefined : value/);
  assert.match(actions, /productSchema\.safeParse\(raw\)/);
  assert.match(actions, /\.update\(toDbRow\(values, brandId\)\)[\s\S]*\.select\("id"\)[\s\S]*\.maybeSingle\(\)/);
  assert.match(actions, /商品未更新/);
});

test("product saves close before one background refresh and expose stage timings", async () => {
  const [form, dialog, explorer, actions] = await Promise.all([
    source("../components/admin/product-form.tsx"),
    source("../components/admin/product-form-dialog.tsx"),
    source("../components/product-explorer.tsx"),
    source("../app/actions/products.ts"),
  ]);

  assert.match(form, /if \(pendingImage\)[\s\S]*optimizeImageForUpload[\s\S]*uploadProductImage/);
  assert.match(form, /if \(submittingRef\.current\) return/);
  assert.match(form, /disabled=\{pending\}/);
  assert.ok(form.indexOf("if (onSaved) onSaved()") < form.indexOf("router.refresh()"));
  assert.match(form, /clientValidationMs/);
  assert.match(form, /imageOptimizeMs/);
  assert.match(form, /imageUploadMs/);
  assert.match(form, /serverActionMs/);
  assert.match(form, /modalCloseMs/);
  assert.match(dialog, /onSaved=\{handleSaved\}/);
  assert.match(explorer, /stage: "refresh-complete"/);
  assert.match(explorer, /refreshMs/);

  const updateStart = actions.indexOf("export async function updateProduct");
  const updateEnd = actions.indexOf("export async function deleteProduct", updateStart);
  const updateBody = actions.slice(updateStart, updateEnd);
  assert.match(updateBody, /image_url, brand_id, brand:brands\(name\)/);
  assert.match(updateBody, /existing\.brand_id/);
  assert.match(updateBody, /databaseWriteMs/);
  assert.match(updateBody, /imageCleanupMs/);
  assert.doesNotMatch(updateBody, /revalidatePath|redirect\(/);
});
