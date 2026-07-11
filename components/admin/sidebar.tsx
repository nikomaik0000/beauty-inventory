"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Boxes, LayoutList, LogOut, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";

const links = [
  { href: "/admin", label: "商品", icon: LayoutList },
  { href: "/admin/categories", label: "分類", icon: Layers },
  { href: "/admin/brands", label: "品牌", icon: Boxes },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 flex-col gap-1 border-b border-divider pb-4 sm:w-48 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
      <Link href="/" className="mb-3 flex items-center gap-1.5 text-xs font-medium text-textMuted hover:text-textPrimary">
        <ArrowLeft size={13} />
        返回首頁
      </Link>
      {links.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accentSoft text-accentStrong" : "text-textSecondary hover:bg-surfaceMuted",
            )}
          >
            <link.icon size={15} />
            {link.label}
          </Link>
        );
      })}
      <form action={signOut} className="mt-2 border-t border-divider pt-2">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
        >
          <LogOut size={15} />
          登出
        </button>
      </form>
    </nav>
  );
}
