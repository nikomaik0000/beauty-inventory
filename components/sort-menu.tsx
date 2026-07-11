"use client";

import { ArrowDownUp } from "lucide-react";
import { Select } from "@/components/ui/input";
import type { SortField } from "@/lib/types";

const options: { value: SortField; label: string }[] = [
  { value: "expiration", label: "Expiration date (soonest first)" },
  { value: "brand", label: "Brand" },
  { value: "name", label: "Product name" },
  { value: "created_at", label: "Date added" },
  { value: "updated_at", label: "Last updated" },
  { value: "quantity", label: "Quantity" },
];

export function SortMenu({ value, onChange }: { value: SortField; onChange: (v: SortField) => void }) {
  return (
    <div className="relative flex items-center gap-2">
      <ArrowDownUp size={14} className="pointer-events-none absolute left-3 text-textMuted" />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as SortField)}
        className="pl-8 w-auto min-w-[180px]"
        aria-label="Sort by"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
