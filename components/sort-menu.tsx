"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { animation } from "@/lib/design-system";
import type { SortField } from "@/lib/types";

/**
 * A self-contained sort control, purpose-built for this one spot rather
 * than reusing the shared Dropdown (which still backs the filter
 * dialog's fields) — this phase is scoped to "only the sorting
 * component," so the filter dialog's look/behavior stays completely
 * untouched.
 *
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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="排序方式"
        className={cn(
          "flex h-10 shrink-0 items-center rounded-input border border-border bg-surface px-3.5 text-sm font-medium text-textSecondary transition-colors duration-base hover:bg-surfaceMuted",
          open && "border-accent text-accentStrong",
        )}
      >
        {selected.label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="排序方式"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animation.motion.fast, ease: animation.motion.ease }}
            className="absolute left-0 z-30 mt-2 min-w-[128px] overflow-hidden rounded-dropdown border border-border bg-surface p-1.5 shadow-dropdown"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-input px-2.5 py-1.5 text-left text-sm transition-colors duration-fast hover:bg-surfaceMuted",
                      isSelected ? "text-accentStrong" : "text-textPrimary",
                    )}
                  >
                    <Check size={13} className={cn("shrink-0", !isSelected && "invisible")} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
