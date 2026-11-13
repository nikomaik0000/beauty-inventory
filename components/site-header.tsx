import Link from "next/link";
import { Plus, Settings } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-divider bg-surface/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-semibold text-textPrimary">Beauty Inventory</p>
            <p className="truncate text-[11px] text-textMuted">Personal Skincare Inventory</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/admin/products/new"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-button border border-border bg-surface px-3.5 text-xs font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
          >
            <Plus size={14} strokeWidth={1.75} />
            新增商品
          </Link>
          <Link
            href="/admin/settings"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-border bg-surface text-textSecondary transition-colors hover:bg-surfaceMuted"
            aria-label="設定"
          >
            <Settings size={14} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </header>
  );
}
