"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/types";

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-border bg-surface p-0.5">
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
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0",
            mode === opt.mode
              ? "bg-accentSoft text-accentStrong"
              : "text-textSecondary hover:text-textPrimary",
          )}
        >
          <opt.icon size={15} />
        </button>
      ))}
    </div>
  );
}
