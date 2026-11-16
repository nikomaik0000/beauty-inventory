"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { openProductForm } from "@/lib/product-form-events";

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

export function SiteHeader({ onAddProduct }: { onAddProduct?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b border-divider bg-surface/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-semibold text-textPrimary">Beauty Inventory</p>
            <p className="truncate text-[11px] text-textMuted">Personal Skincare Inventory</p>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-5 sm:flex">
          <nav aria-label="主要導覽" className="flex items-center divide-x divide-divider">
            {navigation.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-6 py-1 text-sm font-medium tracking-[1.5px] transition-colors",
                    active
                      ? "text-accentStrong"
                      : "text-textSecondary hover:text-textPrimary",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => {
              if (onAddProduct) onAddProduct();
              else if (pathname === "/") openProductForm({ mode: "new" });
              else router.push("/?productForm=new");
            }}
            aria-label="新增商品"
            title="新增商品"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-textSecondary transition-colors hover:bg-surfaceMuted hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft"
          >
            <Plus size={15} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </header>
  );
}
