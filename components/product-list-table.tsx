"use client";

import { Heart, PackageCheck, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCategoryPath, formatExpiration, getExpirationStatus } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/types";

const statusTone = {
  expired: "danger",
  urgent: "danger",
  soon: "warning",
  ok: "default",
  none: "muted",
  unknown: "muted",
} as const;

export function ProductListTable({
  products,
  onToggleFavorite,
}: {
  products: ProductWithRelations[];
  onToggleFavorite?: (id: string, next: boolean) => void;
}) {
  return (
    <div className="rounded-card border border-border bg-surface shadow-card">
      {/* Desktop / tablet: a real compact table. Hidden below sm to avoid
          any risk of horizontal overflow on narrow phones. */}
      <table className="hidden w-full text-left text-sm sm:table">
        <thead>
          <tr className="border-b border-divider text-xs font-medium text-textMuted">
            <th className="px-4 py-2.5 font-medium">商品</th>
            <th className="px-3 py-2.5 font-medium">品牌</th>
            <th className="px-3 py-2.5 font-medium">分類</th>
            <th className="px-3 py-2.5 font-medium">截止日期</th>
            <th className="px-3 py-2.5 text-right font-medium">庫存</th>
            <th className="px-3 py-2.5 text-center font-medium">收藏</th>
            <th className="px-4 py-2.5 text-center font-medium">開封</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const status = getExpirationStatus(p);
            return (
              <tr key={p.id} className="border-b border-divider last:border-0 hover:bg-surfaceMuted/50">
                <td className="max-w-0 px-4 py-2.5">
                  <p className="truncate font-medium text-textPrimary">{p.name}</p>
                  {p.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <Badge key={t.id} className="text-[10px]">{t.name}</Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="max-w-0 truncate px-3 py-2.5 text-textSecondary">{p.brand?.name ?? "—"}</td>
                <td className="max-w-0 truncate px-3 py-2.5 text-textSecondary">
                  {formatCategoryPath(p.category?.name, p.subcategory?.name)}
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={statusTone[status]} className="whitespace-nowrap text-[11px]">
                    {formatExpiration(p)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-right text-textSecondary">×{p.quantity}</td>
                <td className="px-3 py-2.5 text-center">
                  <button
                    type="button"
                    aria-label={p.is_favorite ? "取消收藏" : "加入收藏"}
                    onClick={() => onToggleFavorite?.(p.id, !p.is_favorite)}
                    className={cn("text-textMuted transition-colors hover:text-danger", p.is_favorite && "text-danger")}
                  >
                    <Heart size={15} fill={p.is_favorite ? "currentColor" : "none"} />
                  </button>
                </td>
                <td className="px-4 py-2.5 text-center text-textMuted">
                  {p.opened ? <PackageOpen size={15} className="mx-auto" /> : <PackageCheck size={15} className="mx-auto opacity-40" />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile: compact stacked rows — same information, no fixed-width
          columns, so nothing can force horizontal scrolling. */}
      <ul className="divide-y divide-divider sm:hidden">
        {products.map((p) => {
          const status = getExpirationStatus(p);
          return (
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-textPrimary">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-textSecondary">
                    {p.brand?.name ? `${p.brand.name} · ` : ""}
                    {formatCategoryPath(p.category?.name, p.subcategory?.name)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={p.is_favorite ? "取消收藏" : "加入收藏"}
                  onClick={() => onToggleFavorite?.(p.id, !p.is_favorite)}
                  className={cn("shrink-0 text-textMuted transition-colors hover:text-danger", p.is_favorite && "text-danger")}
                >
                  <Heart size={15} fill={p.is_favorite ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={statusTone[status]} className="text-[11px]">{formatExpiration(p)}</Badge>
                <span className="text-xs text-textMuted">×{p.quantity}</span>
                {p.opened ? (
                  <span className="flex items-center gap-1 text-xs text-textMuted">
                    <PackageOpen size={12} />已開封
                  </span>
                ) : (
                  <span className="text-xs text-textMuted">未開封</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
