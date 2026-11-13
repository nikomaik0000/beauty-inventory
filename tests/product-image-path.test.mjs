import test from "node:test";
import assert from "node:assert/strict";
import {
  extractProductImagePath,
  protectedProductImageUrl,
} from "../lib/product-image-path.ts";

test("existing public Storage URLs become protected proxy URLs", () => {
  const source =
    "https://project.supabase.co/storage/v1/object/public/product-images/products/abc123.webp";
  assert.equal(extractProductImagePath(source), "products/abc123.webp");
  assert.equal(
    protectedProductImageUrl(source),
    "/api/product-images?path=products%2Fabc123.webp",
  );
});

test("signed, authenticated, and legacy root paths remain compatible", () => {
  assert.equal(
    extractProductImagePath(
      "https://project.supabase.co/storage/v1/object/sign/product-images/products/a.webp?token=x",
    ),
    "products/a.webp",
  );
  assert.equal(
    extractProductImagePath(
      "https://project.supabase.co/storage/v1/object/authenticated/product-images/legacy.webp",
    ),
    "legacy.webp",
  );
  assert.equal(extractProductImagePath("products/future.webp"), "products/future.webp");
});

test("external and traversal paths are rejected", () => {
  assert.equal(extractProductImagePath("https://example.com/image.webp"), null);
  assert.equal(extractProductImagePath("products/../secret.webp"), null);
  assert.equal(extractProductImagePath("products//broken.webp"), null);
  assert.equal(protectedProductImageUrl(null), null);
});

