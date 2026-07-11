"use client";

import { Search, X } from "lucide-react";

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex-1">
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜尋商品…"
        className="h-10 w-full rounded-xl border border-border bg-searchBackground pl-10 pr-9 text-sm text-textPrimary placeholder:text-textMuted focus:border-accent transition-colors"
      />
      {value && (
        <button
          type="button"
          aria-label="清除搜尋"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
