"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "商品" },
  { href: "/admin/categories", label: "分類" },
  { href: "/admin/brands", label: "品牌" },
  { href: "/admin/settings", label: "設定" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/admin/products/");
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-divider bg-surface/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-semibold text-textPrimary">Beauty Inventory</p>
            <p className="truncate text-[11px] text-textMuted">Personal Skincare Inventory</p>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-5 sm:flex">
          <nav aria-label="主要導覽" className="flex items-center gap-1">
            {navigation.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-input px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accentSoft text-accentStrong"
                      : "text-textSecondary hover:bg-surfaceMuted hover:text-textPrimary",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/admin/products/new"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-button border border-border bg-surface px-3.5 text-xs font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
          >
            <Plus size={14} strokeWidth={1.75} />
            新增商品
          </Link>
        </div>
      </div>
    </header>
  );
}
