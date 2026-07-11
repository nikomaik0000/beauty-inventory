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
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-surface">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-card border border-border bg-surface p-4 shadow-cardHover">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-textPrimary">Filters</h3>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="text-textMuted hover:text-textPrimary">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-textSecondary">Category</label>
              <Select
                value={filters.categoryId ?? ""}
                onChange={(e) => onChange({ ...filters, categoryId: e.target.value || null, subcategoryId: null })}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-textSecondary">Subcategory</label>
              <Select
                value={filters.subcategoryId ?? ""}
                onChange={(e) => update("subcategoryId", e.target.value || null)}
                disabled={visibleSubcategories.length === 0}
              >
                <option value="">All subcategories</option>
                {visibleSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-textSecondary">Brand</label>
              <Select value={filters.brandId ?? ""} onChange={(e) => update("brandId", e.target.value || null)}>
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-textSecondary">Status</label>
              <Select value={filters.openedStatus} onChange={(e) => update("openedStatus", e.target.value as ProductFilters["openedStatus"])}>
                <option value="all">Opened & unopened</option>
                <option value="opened">Opened only</option>
                <option value="unopened">Unopened only</option>
              </Select>
            </div>

            {tags.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-textSecondary">Tags</label>
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

            <div className="flex flex-col gap-2 border-t border-divider pt-3">
              <label className="flex items-center gap-2 text-sm text-textSecondary">
                <input
                  type="checkbox"
                  checked={filters.favoritesOnly}
                  onChange={(e) => update("favoritesOnly", e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                Favorites only
              </label>
              <label className="flex items-center gap-2 text-sm text-textSecondary">
                <input
                  type="checkbox"
                  checked={filters.expiringSoonOnly}
                  onChange={(e) => update("expiringSoonOnly", e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                Expiring soon
              </label>
            </div>
          </div>

          {activeCount > 0 && (
            <button type="button" onClick={reset} className="mt-4 text-xs font-medium text-accentStrong hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
