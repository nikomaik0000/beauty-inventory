import type { ProductFilters, ProductWithRelations } from "./types";

type ExpiringSoonMatcher = (product: ProductWithRelations) => boolean;

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesNormalizedSearch(product: ProductWithRelations, search: string): boolean {
  if (!search) return true;

  return [
    product.name,
    product.brand?.name,
    product.category?.name,
    product.subcategory?.name,
  ].some((value) => value?.toLowerCase().includes(search));
}

/** Matches the homepage search against the product's displayed relation names. */
export function productMatchesSearch(product: ProductWithRelations, search: string): boolean {
  return matchesNormalizedSearch(product, normalizeSearch(search));
}

/**
 * Applies homepage search and filters in one pass. A product is included once
 * when any searchable field matches and every active filter also matches.
 */
export function filterProducts(
  products: ProductWithRelations[],
  filters: ProductFilters,
  isProductExpiringSoon: ExpiringSoonMatcher,
): ProductWithRelations[] {
  const search = normalizeSearch(filters.search);

  return products.filter((product) => {
    if (!matchesNormalizedSearch(product, search)) return false;
    if (filters.categoryId && product.category_id !== filters.categoryId) return false;
    if (filters.subcategoryId && product.subcategory_id !== filters.subcategoryId) return false;
    if (filters.brandId && product.brand_id !== filters.brandId) return false;
    if (filters.expiringSoonOnly && !isProductExpiringSoon(product)) return false;
    return true;
  });
}
