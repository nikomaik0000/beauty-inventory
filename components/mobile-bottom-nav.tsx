"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutGrid, Layers, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "商品", icon: LayoutGrid },
  { href: "/admin/categories", label: "分類", icon: Layers },
  { href: "/admin/brands", label: "品牌", icon: Boxes },
  { href: "/admin/settings", label: "設定", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const obscuredHeight = window.innerHeight - viewport.height - viewport.offsetTop;
      setKeyboardOpen(obscuredHeight > 140);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  // Editing uses its own safe-area/keyboard-aware save bar. Hiding the global
  // navigation there prevents two fixed bars competing for the same space.
  if (pathname.startsWith("/admin/products/")) return null;

  return (
    <nav
      aria-label="主要導覽"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur sm:hidden",
        keyboardOpen && "hidden",
      )}
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-input px-1 text-[11px] font-medium",
                active ? "text-accentStrong" : "text-textMuted",
              )}
            >
              <link.icon size={20} strokeWidth={active ? 2 : 1.75} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
