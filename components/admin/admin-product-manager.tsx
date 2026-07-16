"use client";

import { useMemo, useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { FilterPanel } from "@/components/filter-panel";
import { ProductTable } from "@/components/admin/product-table";
import { DataToolbar } from "@/components/admin/data-toolbar";
import { defaultFilters } from "@/lib/types";
import type { Brand, Category, ProductFilters, ProductWithRelations, Subcategory } from "@/lib/types";

/** Owns admin-side search/filter state so CSV export can scope to
 * "currently visible" products. Reuses the same `SearchBar` /
 * `FilterPanel` already used on the public product explorer — same
 * component, same look, nothing new introduced here. `ProductTable`
 * itself is untouched: it just receives the already-filtered list. */
export function AdminProductManager({
  products,
  categories,
  subcategories,
  brands,
}: {
  products: ProductWithRelations[];
  categories: Category[];
  subcategories: Subcategory[];
  brands: Brand[];
}) {
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);

  const activeFilterCount =
    (filters.categoryId ? 1 : 0) +
    (filters.subcategoryId ? 1 : 0) +
    (filters.brandId ? 1 : 0) +
    (filters.openedStatus !== "all" ? 1 : 0);

  const filtersActive = activeFilterCount > 0 || filters.search.trim() !== "";

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search)) return false;
      if (filters.categoryId && p.category_id !== filters.categoryId) return false;
      if (filters.subcategoryId && p.subcategory_id !== filters.subcategoryId) return false;
      if (filters.brandId && p.brand_id !== filters.brandId) return false;
      if (filters.openedStatus === "opened" && !p.opened) return false;
      if (filters.openedStatus === "unopened" && p.opened) return false;
      return true;
    });
  }, [products, filters]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          {/* Mobile: single baseline-aligned row — CJK serif "商品" at
              ~32px next to a smaller gray count, no wrap. Desktop keeps
              the original stacked h1/p untouched below. */}
          <div className="flex items-baseline gap-2 whitespace-nowrap sm:hidden">
            <h1
              className="text-[32px] font-semibold leading-none text-textPrimary"
              style={{ fontFamily: "var(--font-serif-cjk)" }}
            >
              商品
            </h1>
            <p className="text-sm text-textMuted">
              共 {filtered.length} 件{filtersActive ? `（篩選自 ${products.length} 件）` : ""}
            </p>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-serif text-xl font-semibold text-textPrimary">商品</h1>
            <p className="text-sm text-textMuted">
              共 {filtered.length} 件{filtersActive ? `（篩選自 ${products.length} 件）` : ""}
            </p>
          </div>
        </div>
        {/* Export scopes to `filtered` (all products when no filters are
            active); import always matches against the full `products`
            list regardless of what's currently filtered/visible. */}
        <DataToolbar visibleProducts={filtered} allProducts={products} categories={categories} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchBar value={filters.search} onChange={(v) => setFilters((f) => ({ ...f, search: v }))} />
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          categories={categories}
          subcategories={subcategories}
          brands={brands}
          activeCount={activeFilterCount}
        />
      </div>

      <ProductTable products={filtered} />
    </div>
  );
}
