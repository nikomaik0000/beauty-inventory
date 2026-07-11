"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SearchBar } from "@/components/search-bar";
import { FilterPanel } from "@/components/filter-panel";
import { SortMenu } from "@/components/sort-menu";
import { ViewToggle } from "@/components/view-toggle";
import { ProductListTable } from "@/components/product-list-table";
import { ProductCardGrid } from "@/components/product-card-grid";
import { useLocalStorage } from "@/lib/use-local-storage";
import { daysUntil, isExpiringSoon } from "@/lib/utils";
import { defaultFilters } from "@/lib/types";
import type {
  Brand,
  Category,
  ProductFilters,
  ProductWithRelations,
  SortField,
  Subcategory,
  ViewMode,
} from "@/lib/types";

export function ProductExplorer({
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
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("beauty-inventory:view-mode", "list");
  const [sortField, setSortField] = useLocalStorage<SortField>("beauty-inventory:sort-field", "expiration");
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);

  const activeFilterCount =
    (filters.categoryId ? 1 : 0) +
    (filters.subcategoryId ? 1 : 0) +
    (filters.brandId ? 1 : 0) +
    (filters.openedStatus !== "all" ? 1 : 0) +
    (filters.expiringSoonOnly ? 1 : 0);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search)) return false;
      if (filters.categoryId && p.category_id !== filters.categoryId) return false;
      if (filters.subcategoryId && p.subcategory_id !== filters.subcategoryId) return false;
      if (filters.brandId && p.brand_id !== filters.brandId) return false;
      if (filters.openedStatus === "opened" && !p.opened) return false;
      if (filters.openedStatus === "unopened" && p.opened) return false;
      if (filters.expiringSoonOnly && !isExpiringSoon(p)) return false;
      return true;
    });
  }, [products, filters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      switch (sortField) {
        case "expiration": {
          const aDated = a.expiration_type === "dated" && a.expiration_date;
          const bDated = b.expiration_type === "dated" && b.expiration_date;
          if (aDated && !bDated) return -1;
          if (!aDated && bDated) return 1;
          if (aDated && bDated) return daysUntil(a.expiration_date!) - daysUntil(b.expiration_date!);
          return a.name.localeCompare(b.name);
        }
        case "brand":
          return (a.brand?.name ?? "\uffff").localeCompare(b.brand?.name ?? "\uffff");
        case "name":
          return a.name.localeCompare(b.name);
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "updated_at":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case "quantity":
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });
    return list;
  }, [filtered, sortField]);

  const categoryIndexOf = (categoryId: string | null) => {
    if (!categoryId) return 0;
    const idx = categories.findIndex((c) => c.id === categoryId);
    return idx < 0 ? 0 : idx;
  };

  // Reuses `sorted` — the same filtered/sorted list already rendered
  // below — so this never triggers another query and always matches
  // what's on screen. Capacity is only summed for products that
  // actually have one set; an empty/null capacity is skipped rather
  // than counted as 0, and if nothing on screen has a capacity at all
  // the total shows "—" instead of "0".
  const totalCapacityLabel = useMemo(() => {
    const withCapacity = sorted.filter((p) => p.capacity != null && p.capacity > 0);
    if (withCapacity.length === 0) return "—";
    const sum = withCapacity.reduce((total, p) => total + (p.capacity ?? 0), 0);
    return String(sum);
  }, [sorted]);

  return (
    <div className="w-full min-w-0">
      {/* Row 1: search, full width.
          Row 2: Filter + Sort on the left, view toggle on the right —
          vertically aligned, never wraps. */}
      <div className="flex w-full min-w-0 flex-col gap-3">
        <SearchBar value={filters.search} onChange={(v) => setFilters((f) => ({ ...f, search: v }))} />
        <div className="flex flex-nowrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              categories={categories}
              subcategories={subcategories}
              brands={brands}
              activeCount={activeFilterCount}
            />
            <SortMenu value={sortField} onChange={setSortField} />
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <p className="mt-4 text-xs text-textMuted">共 {sorted.length} 件商品 ・ 總容量 {totalCapacityLabel}</p>

      {sorted.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-textPrimary">沒有符合條件的商品</p>
          <p className="text-xs text-textMuted">試著清除篩選條件或換個關鍵字搜尋看看。</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="mt-4">
          <ProductListTable products={sorted} />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: Math.min(i, 8) * 0.02 }}>
              <ProductCardGrid product={p} categoryIndex={categoryIndexOf(p.category_id)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
