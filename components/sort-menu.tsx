"use client";

import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import type { SortField } from "@/lib/types";

/**
 * The trigger shows only the selected field's name — never a direction
 * ("近→遠", "A→Z", …). Direction is applied internally in
 * product-explorer.tsx and never surfaces in the UI.
 */
const options: { value: SortField; label: string }[] = [
  { value: "expiration", label: "效期" },
  { value: "brand", label: "品牌" },
  { value: "updated_at", label: "更新" },
  { value: "quantity", label: "庫存" },
];

export function SortMenu({ value, onChange }: { value: SortField; onChange: (v: SortField) => void }) {
  return (
    <Dropdown
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel="排序方式"
      renderTrigger={({ open, selected, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="排序方式"
          className={cn(
            "flex h-10 shrink-0 items-center rounded-input border border-border bg-surface px-3.5 text-sm font-medium text-textSecondary transition-colors duration-base hover:bg-surfaceMuted",
            open && "border-accent text-accentStrong",
          )}
        >
          {selected?.label ?? options[0].label}
        </button>
      )}
    />
  );
}
