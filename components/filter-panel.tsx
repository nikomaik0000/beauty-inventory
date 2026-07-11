"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { defaultFilters } from "@/lib/types";
import type { Brand, Category, ProductFilters, Subcategory, Tag } from "@/lib/types";

/**
 * Filter entry point + centered modal dialog.
 *
 * Phase 2A: replaced the old dropdown/drawer (which could render partly
 * off-screen) with a modal that's always centered and always capped to
 * the viewport, on every screen size. Edits are staged locally and only
 * committed to the parent when "套用" (Apply) is pressed, so "取消"
 * (Cancel) can cleanly discard them.
 *
 * `tags` stays in the prop type (unused here) so the caller doesn't need
 * to change — this pass only touches the filter UI itself.
 */
export function FilterPanel({
  filters,
  onChange,
  categories,
  subcategories,
  brands,
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
  const [draft, setDraft] = useState<ProductFilters>(filters);

  // Re-sync the draft to whatever is currently applied every time the
  // modal opens, so stale edits from a previous open (that were
  // cancelled) never resurface.
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const visibleSubcategories = draft.categoryId
    ? subcategories.filter((s) => s.category_id === draft.categoryId)
    : subcategories;

  function update<K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearAll() {
    setDraft({ ...defaultFilters, search: filters.search });
  }

  function handleApply() {
    onChange(draft);
    setOpen(false);
  }

  function handleCancel() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          {/* Dimmed backdrop, always on, on every breakpoint */}
          <button
            type="button"
            aria-label="關閉篩選"
            onClick={handleCancel}
            className="absolute inset-0 bg-textPrimary/30"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="篩選"
            className="relative flex max-h-[85vh] w-full max-w-sm flex-col rounded-card border border-border bg-surface shadow-cardHover"
          >
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <h3 className="text-sm font-semibold text-textPrimary">篩選</h3>
              <button type="button" onClick={handleCancel} aria-label="關閉篩選" className="text-textMuted hover:text-textPrimary">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-textSecondary">大分類</label>
                <Select
                  value={draft.categoryId ?? ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, categoryId: e.target.value || null, subcategoryId: null }))}
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
                  value={draft.subcategoryId ?? ""}
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
                <Select value={draft.brandId ?? ""} onChange={(e) => update("brandId", e.target.value || null)}>
                  <option value="">全部品牌</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-textSecondary">開封狀態</label>
                <Select value={draft.openedStatus} onChange={(e) => update("openedStatus", e.target.value as ProductFilters["openedStatus"])}>
                  <option value="all">全部</option>
                  <option value="opened">僅已開封</option>
                  <option value="unopened">僅未開封</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-divider px-5 py-4">
              <button type="button" onClick={handleClearAll} className="text-xs font-medium text-accentStrong hover:underline">
                清除全部
              </button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
                  取消
                </Button>
                <Button type="button" size="sm" onClick={handleApply}>
                  套用
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
