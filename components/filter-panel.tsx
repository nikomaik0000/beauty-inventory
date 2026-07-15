"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { Dialog } from "@/components/ui/dialog";
import { DropdownField } from "@/components/ui/dropdown";
import { defaultFilters } from "@/lib/types";
import type { Brand, Category, ProductFilters, Subcategory } from "@/lib/types";

/**
 * Filter entry point + centered modal dialog, built on the shared
 * Dialog/DropdownField/ToolbarButton primitives so its look tracks the
 * rest of the design system automatically.
 *
 * Edits are staged locally and only committed to the parent when
 * "套用" (Apply) is pressed, so "取消" (Cancel) can cleanly discard them.
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
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProductFilters>(filters);
  const dialogBodyRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <ToolbarButton
        icon={SlidersHorizontal}
        label="篩選"
        active={open}
        badgeCount={activeCount}
        aria-label="篩選"
        onClick={() => setOpen(true)}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="篩選"
        contentRef={dialogBodyRef}
        footer={
          <>
            <button type="button" onClick={handleClearAll} className="text-xs font-medium text-accentStrong hover:underline">
              清除全部
            </button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="button" size="sm" onClick={handleApply}>
                套用
              </Button>
            </div>
          </>
        }
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-textSecondary">大分類</label>
          <DropdownField
            boundaryRef={dialogBodyRef}
            value={draft.categoryId ?? ""}
            onChange={(v) => setDraft((prev) => ({ ...prev, categoryId: v || null, subcategoryId: null }))}
            placeholder="全部分類"
            ariaLabel="大分類"
            options={[{ value: "", label: "全部分類" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-textSecondary">小分類</label>
          <DropdownField
            boundaryRef={dialogBodyRef}
            value={draft.subcategoryId ?? ""}
            onChange={(v) => update("subcategoryId", v || null)}
            placeholder="全部小分類"
            ariaLabel="小分類"
            disabled={visibleSubcategories.length === 0}
            options={[{ value: "", label: "全部小分類" }, ...visibleSubcategories.map((s) => ({ value: s.id, label: s.name }))]}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-textSecondary">品牌</label>
          <DropdownField
            boundaryRef={dialogBodyRef}
            value={draft.brandId ?? ""}
            onChange={(v) => update("brandId", v || null)}
            placeholder="全部品牌"
            ariaLabel="品牌"
            options={[{ value: "", label: "全部品牌" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-textSecondary">開封狀態</label>
          <DropdownField
            boundaryRef={dialogBodyRef}
            value={draft.openedStatus}
            onChange={(v) => update("openedStatus", v as ProductFilters["openedStatus"])}
            placeholder="全部"
            ariaLabel="開封狀態"
            options={[
              { value: "all", label: "全部" },
              { value: "opened", label: "僅已開封" },
              { value: "unopened", label: "僅未開封" },
            ]}
          />
        </div>
      </Dialog>
    </>
  );
}
