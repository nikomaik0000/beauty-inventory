"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/types";

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded-full border border-border bg-surface p-0.5">
      {(
        [
          { mode: "list" as const, icon: List, label: "List" },
          { mode: "card" as const, icon: LayoutGrid, label: "Card" },
        ]
      ).map((opt) => (
        <button
          key={opt.mode}
          type="button"
          onClick={() => onChange(opt.mode)}
          aria-pressed={mode === opt.mode}
          aria-label={`${opt.label} view`}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
            mode === opt.mode
              ? "bg-accentSoft text-accentStrong"
              : "text-textSecondary hover:text-textPrimary",
          )}
        >
          <opt.icon size={14} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
