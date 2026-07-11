import Link from "next/link";
import { Settings, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b border-divider bg-surface/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accentSoft text-accentStrong">
            <Sparkles size={16} />
          </span>
          <div className="leading-tight">
            <p className="font-serif text-base font-semibold text-textPrimary">Beauty Inventory</p>
            <p className="text-[11px] text-textMuted">Personal Skincare Inventory</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
          >
            <Settings size={14} />
            Admin
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
