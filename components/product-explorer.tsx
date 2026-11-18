"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { FilterPanel } from "@/components/filter-panel";
import { SortMenu } from "@/components/sort-menu";
import { ProductCardGrid } from "@/components/product-card-grid";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { ProductFormDialog } from "@/components/admin/product-form-dialog";
import { useLocalStorage } from "@/lib/use-local-storage";
import { daysUntil, isExpiringSoon, volumeContribution } from "@/lib/utils";
import { filterProducts } from "@/lib/product-filters";
import { defaultFilters } from "@/lib/types";
import {
  openProductForm,
  PRODUCT_FORM_OPEN_EVENT,
  PRODUCT_FORM_REFRESH_MARK,
  type ProductFormRequest,
} from "@/lib/product-form-events";
import type {
  Brand,
  Category,
  ProductFilters,
  ProductWithRelations,
  SortField,
  Subcategory,
} from "@/lib/types";

function compareTextStable(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

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
  const [sortField, setSortField] = useLocalStorage<SortField>("beauty-inventory:sort-field", "expiration");
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [openSwipeProductId, setOpenSwipeProductId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const productFormParam = searchParams.get("productForm");
  const [productForm, setProductForm] = useState<ProductFormRequest | null>(() => parseProductFormParam(productFormParam));
  const formProduct = productForm && productForm.mode !== "new"
    ? products.find((item) => item.id === productForm.productId)
    : undefined;
  const formOpen = productForm?.mode === "new" || Boolean(formProduct);

  useEffect(() => {
    const handleOpen = (event: Event) => setProductForm((event as CustomEvent<ProductFormRequest>).detail);
    window.addEventListener(PRODUCT_FORM_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(PRODUCT_FORM_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    const marks = performance.getEntriesByName(PRODUCT_FORM_REFRESH_MARK, "mark");
    const latestMark = marks.at(-1);
    if (!latestMark) return;

    console.info("[product-save:client]", {
      stage: "refresh-complete",
      refreshMs: Math.round((performance.now() - latestMark.startTime) * 10) / 10,
    });
    performance.clearMarks(PRODUCT_FORM_REFRESH_MARK);
  }, [products, categories, subcategories]);

  useEffect(() => {
    if (!productFormParam) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [productFormParam]);

  useEffect(() => {
    if (!openSwipeProductId) return;

    const closeWhenTouchingElsewhere = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const card = target.closest("[data-product-swipe-card]");
      if (card?.getAttribute("data-product-swipe-card") !== openSwipeProductId) {
        setOpenSwipeProductId(null);
      }
    };

    document.addEventListener("pointerdown", closeWhenTouchingElsewhere);
    return () => document.removeEventListener("pointerdown", closeWhenTouchingElsewhere);
  }, [openSwipeProductId]);

  const activeFilterCount =
    (filters.categoryId ? 1 : 0) +
    (filters.subcategoryId ? 1 : 0) +
    (filters.brandId ? 1 : 0) +
    (filters.expiringSoonOnly ? 1 : 0);

  const filtered = useMemo(() => {
    return filterProducts(products, filters, isExpiringSoon);
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
          return compareTextStable(a.name, b.name);
        }
        case "brand":
          return compareTextStable(a.brand?.name ?? "\uffff", b.brand?.name ?? "\uffff");
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
  // what's on screen. Built as an array of formatted strings, joined
  // with " ・ ", so a future stat (即將到期) can be appended with one
  // more array entry rather than restructuring this template.
  const summaryParts = useMemo(() => {
    const productCount = sorted.length;
    const totalStock = sorted.reduce((total, p) => total + (Number(p.quantity) || 0), 0);
    const totalVolume = sorted.reduce((total, p) => total + volumeContribution(p), 0);

    return [`共 ${productCount} 件商品`, `總庫存 ${totalStock}`, `總容量 ${totalVolume}`];
  }, [sorted]);

  const selectedProduct = selectedProductId
    ? products.find((product) => product.id === selectedProductId) ?? null
    : null;

  return (
    <div className="w-full min-w-0">
      {/* Row 1: search, full width. Row 2: Filter + Sort. */}
      <div className="flex w-full min-w-0 flex-col gap-3">
        <SearchBar value={filters.search} onChange={(v) => setFilters((f) => ({ ...f, search: v }))} />
        <div className="flex flex-nowrap items-center gap-2">
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
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-textMuted">
        {summaryParts.map((part) => (
          <span key={part}>{part}</span>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-textPrimary">沒有符合條件的商品</p>
          <p className="text-xs text-textMuted">試著清除篩選條件或換個關鍵字搜尋看看。</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p, i) => (
            <motion.div className="h-full" key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: Math.min(i, 8) * 0.02 }}>
              <ProductCardGrid
                product={p}
                categoryIndex={categoryIndexOf(p.category_id)}
                onOpen={() => setSelectedProductId(p.id)}
                onDeleted={() => setSelectedProductId(null)}
                swipeOpen={openSwipeProductId === p.id}
                onSwipeOpen={() => setOpenSwipeProductId(p.id)}
                onSwipeClose={() => setOpenSwipeProductId(null)}
              />
            </motion.div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => openProductForm({ mode: "new" })}
        aria-label="新增商品"
        className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom))] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-button border border-border bg-surface text-accentStrong shadow-dialog sm:hidden"
      >
        <Plus size={24} strokeWidth={1.75} />
      </button>

      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProductId(null)}
      />
      <ProductFormDialog
        open={formOpen}
        mode={productForm?.mode ?? "new"}
        product={formProduct}
        categories={categories}
        subcategories={subcategories}
        onClose={() => setProductForm(null)}
      />
    </div>
  );
}

function parseProductFormParam(param: string | null): ProductFormRequest | null {
  if (param === "new") return { mode: "new" };
  if (param?.startsWith("edit:") && param.slice(5)) return { mode: "edit", productId: param.slice(5) };
  if (param?.startsWith("duplicate:") && param.slice(10)) return { mode: "duplicate", productId: param.slice(10) };
  return null;
}
