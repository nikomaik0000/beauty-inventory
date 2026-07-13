import Link from "next/link";
import { Settings, Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-divider bg-surface/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-accentSoft text-accentStrong">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-serif text-base font-semibold text-textPrimary">Beauty Inventory</p>
            <p className="truncate text-[11px] text-textMuted">Personal Skincare Inventory</p>
          </div>
        </Link>

        <Link
          href="/admin"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-button border border-border bg-surface px-3.5 text-xs font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
        >
          <Settings size={14} />
          <span className="hidden sm:inline">後台</span>
        </Link>
      </div>
    </header>
  );
}
