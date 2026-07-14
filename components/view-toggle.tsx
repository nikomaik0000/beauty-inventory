"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/types";

/** Compact, icon-only segmented control — no text labels at any
 * breakpoint. Border radius is the same `rounded-button` pill in every
 * state (default/hover/active/selected); only color changes. */
export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex shrink-0 items-center rounded-button border border-border bg-surface p-0.5">
      {(
        [
          { mode: "list" as const, icon: List, label: "列表" },
          { mode: "card" as const, icon: LayoutGrid, label: "卡片" },
        ]
      ).map((opt) => (
        <button
          key={opt.mode}
          type="button"
          onClick={() => onChange(opt.mode)}
          aria-pressed={mode === opt.mode}
          aria-label={`${opt.label}檢視`}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-button transition-colors duration-base",
            mode === opt.mode
              ? "bg-accentSoft text-accentStrong"
              : "text-textSecondary hover:text-textPrimary",
          )}
        >
          <opt.icon size={20} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}
