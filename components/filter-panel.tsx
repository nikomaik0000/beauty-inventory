"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Brand, Category, ProductFilters, Subcategory, Tag } from "@/lib/types";

export function FilterPanel({
  filters,
  onChange,
  categories,
  subcategories,
  brands,
  tags,
  activeCount,
}: {
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
  categories: Category[];
  subcategories: Subcategory[];
  brands: Brand[];
  tags: Tag[];
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  const visibleSubcategories = filters.categoryId
    ? subcategories.filter((s) => s.category_id === filters.categoryId)
    : subcategories;

  function update<K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleTag(id: string) {
    const has = filters.tagIds.includes(id);
    update("tagIds", has ? filters.tagIds.filter((t) => t !== id) : [...filters.tagIds, id]);
  }

  function reset() {
    onChange({
      search: filters.search,
      categoryId: null,
      subcategoryId: null,
      brandId: null,
      tagIds: [],
      openedStatus: "all",
      favoritesOnly: false,
      expiringSoonOnly: false,
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-medium text-textSecondary transition-colors hover:bg-surfaceMuted",
          open && "border-accent text-accentStrong",
        )}
      >
        <SlidersHorizontal size={15} />
        <span className="hidden sm:inline">篩選</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-surface">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop — tapping outside closes the drawer */}
          <button
            type="button"
            aria-label="關閉篩選"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 bg-textPrimary/20 sm:hidden"
          />

          <div
            className={cn(
              "z-30 rounded-card border border-border bg-surface p-5 shadow-cardHover",
              // Mobile: fixed, centered drawer that never exceeds the viewport.
              "fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-[340px] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
              // Desktop: anchored dropdown under the trigger button.
              "sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[320px] sm:max-h-none sm:translate-x-0 sm:translate-y-0",
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-textPrimary">篩選</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="關閉篩選" className="text-textMuted hover:text-textPrimary">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-textSecondary">大分類</label>
                <Select
                  value={filters.categoryId ?? ""}
                  onChange={(e) => onChange({ ...filters, categoryId: e.target.value || null, subcategoryId: null })}
                >
                  <option value="">全部分類</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-textSecondary">小分類</label>
                <Select
                  value={filters.subcategoryId ?? ""}
                  onChange={(e) => update("subcategoryId", e.target.value || null)}
                  disabled={visibleSubcategories.length === 0}
                >
                  <option value="">全部小分類</option>
                  {visibleSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-textSecondary">品牌</label>
                <Select value={filters.brandId ?? ""} onChange={(e) => update("brandId", e.target.value || null)}>
                  <option value="">全部品牌</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-textSecondary">開封狀態</label>
                <Select value={filters.openedStatus} onChange={(e) => update("openedStatus", e.target.value as ProductFilters["openedStatus"])}>
                  <option value="all">全部</option>
                  <option value="opened">僅已開封</option>
                  <option value="unopened">僅未開封</option>
                </Select>
              </div>

              {tags.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-textSecondary">標籤</label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => {
                      const active = filters.tagIds.includes(t.id);
                      return (
                        <button key={t.id} type="button" onClick={() => toggleTag(t.id)}>
                          <Badge tone={active ? "accent" : "default"} className={cn("cursor-pointer", active && "ring-1 ring-accent")}>
                            {t.name}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5 border-t border-divider pt-4">
                <label className="flex items-center gap-2 text-sm text-textSecondary">
                  <input
                    type="checkbox"
                    checked={filters.favoritesOnly}
                    onChange={(e) => update("favoritesOnly", e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  僅顯示收藏
                </label>
                <label className="flex items-center gap-2 text-sm text-textSecondary">
                  <input
                    type="checkbox"
                    checked={filters.expiringSoonOnly}
                    onChange={(e) => update("expiringSoonOnly", e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  即將到期
                </label>
              </div>
            </div>

            {activeCount > 0 && (
              <button type="button" onClick={reset} className="mt-4 text-xs font-medium text-accentStrong hover:underline">
                清除所有篩選
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
