import test from "node:test";
import assert from "node:assert/strict";
import { filterProducts, productMatchesSearch } from "../lib/product-filters.ts";

function product(overrides = {}) {
  return {
    id: "product-1",
    name: "Rosemary Mint Shampoo",
    brand_id: "brand-aveda",
    category_id: "category-hair",
    subcategory_id: "subcategory-shampoo",
    image_url: null,
    expiration_type: "none",
    expiration_date: null,
    opened: false,
    opened_date: null,
    pao_months: null,
    capacity: 250,
    quantity: 1,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    brand: { id: "brand-aveda", name: "AVEDA", created_at: "2026-01-01T00:00:00.000Z" },
    category: {
      id: "category-hair",
      name: "頭髮保養",
      sort_order: 1,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    subcategory: {
      id: "subcategory-shampoo",
      category_id: "category-hair",
      name: "洗髮精",
      sort_order: 1,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

const noFilters = {
  search: "",
  categoryId: null,
  subcategoryId: null,
  brandId: null,
  expiringSoonOnly: false,
};

test("homepage search is case-insensitive and supports partial product and brand terms", () => {
  const item = product();

  assert.equal(productMatchesSearch(item, "ROSEmary"), true);
  assert.equal(productMatchesSearch(item, "aveda"), true);
  assert.equal(productMatchesSearch(item, "Aveda"), true);
  assert.equal(productMatchesSearch(item, "ave"), true);
});

test("homepage search supports partial Chinese category and subcategory names", () => {
  const item = product();

  assert.equal(productMatchesSearch(item, "頭髮"), true);
  assert.equal(productMatchesSearch(item, "髮精"), true);
});

test("homepage search uses relation names rather than relation IDs", () => {
  const item = product();

  assert.equal(productMatchesSearch(item, "category-hair"), false);
  assert.equal(productMatchesSearch(item, "brand-aveda"), false);
});

test("matching multiple searchable fields returns a product only once", () => {
  const item = product({
    name: "AVEDA 洗髮精",
    subcategory: {
      id: "subcategory-shampoo",
      category_id: "category-hair",
      name: "AVEDA 洗髮精",
      sort_order: 1,
      created_at: "2026-01-01T00:00:00.000Z",
    },
  });

  assert.deepEqual(filterProducts([item], { ...noFilters, search: "aveda" }, () => false), [item]);
});

test("search and existing filters combine with AND semantics", () => {
  const matching = product();
  const wrongBrand = product({ id: "product-2", brand_id: "brand-other" });
  const wrongCategory = product({ id: "product-3", category_id: "category-face" });
  const wrongSubcategory = product({ id: "product-4", subcategory_id: "subcategory-treatment" });

  const result = filterProducts(
    [matching, wrongBrand, wrongCategory, wrongSubcategory],
    {
      search: "ave",
      categoryId: "category-hair",
      subcategoryId: "subcategory-shampoo",
      brandId: "brand-aveda",
      expiringSoonOnly: false,
    },
    () => false,
  );

  assert.deepEqual(result.map((item) => item.id), ["product-1"]);
});

test("clearing search restores the current filtered result", () => {
  const aveda = product();
  const otherBrand = product({ id: "product-2", brand_id: "brand-other", brand: null });
  const filters = { ...noFilters, search: "no match", categoryId: "category-hair" };

  assert.deepEqual(filterProducts([aveda, otherBrand], filters, () => false), []);
  assert.deepEqual(
    filterProducts([aveda, otherBrand], { ...filters, search: "" }, () => false).map((item) => item.id),
    ["product-1", "product-2"],
  );
});
