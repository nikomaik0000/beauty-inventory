"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Boxes, LayoutList, LogOut, Layers, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";

const links = [
  { href: "/admin", label: "商品", icon: LayoutList },
  { href: "/admin/categories", label: "分類", icon: Layers },
  { href: "/admin/brands", label: "品牌", icon: Boxes },
  { href: "/admin/settings", label: "設定", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * Desktop: unchanged vertical sidebar (now with a 設定 entry). Mobile:
 * a single horizontal tab row instead of a stacked list — the vertical
 * nav + divider + sign-out button it replaces was eating a lot of
 * vertical space on a phone before any products were even visible.
 * "返回首頁" and sign-out aren't in the mobile tab row: the header's
 * logo already links home, and sign-out lives on the Settings page.
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: horizontal tabs */}
      <nav className="flex shrink-0 items-center gap-1 border-b border-divider pb-3 sm:hidden">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-input px-2 py-2 text-sm font-medium transition-colors",
                active ? "bg-accentSoft text-accentStrong" : "text-textSecondary hover:bg-surfaceMuted",
              )}
            >
              <link.icon size={20} strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: vertical sidebar, unchanged structure */}
      <nav className="hidden shrink-0 sm:flex sm:w-48 sm:flex-col sm:gap-1 sm:border-r sm:border-divider sm:pr-4">
        <Link href="/" className="mb-3 flex items-center gap-1.5 text-xs font-medium text-textMuted hover:text-textPrimary">
          <ArrowLeft size={14} strokeWidth={1.75} />
          返回首頁
        </Link>
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-input px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accentSoft text-accentStrong" : "text-textSecondary hover:bg-surfaceMuted",
              )}
            >
              <link.icon size={20} strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
        <form action={signOut} className="mt-2 border-t border-divider pt-2">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-input px-3 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
          >
            <LogOut size={20} strokeWidth={1.75} />
            登出
          </button>
        </form>
      </nav>
    </>
  );
}
