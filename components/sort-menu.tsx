"use client";

import { Select } from "@/components/ui/input";
import type { SortField } from "@/lib/types";

const options: { value: SortField; label: string }[] = [
  { value: "expiration", label: "截止日期（最近優先）" },
  { value: "brand", label: "品牌" },
  { value: "name", label: "商品名稱" },
  { value: "created_at", label: "新增日期" },
  { value: "updated_at", label: "最後更新" },
  { value: "quantity", label: "庫存數量" },
];

export function SortMenu({ value, onChange }: { value: SortField; onChange: (v: SortField) => void }) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as SortField)}
      className="h-10 w-auto min-w-0 max-w-full focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      aria-label="排序方式"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}
