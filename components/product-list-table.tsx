"use client";

import { Package, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCapacity, formatExpiration, getExpirationStatus } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/types";

const statusTone = {
  expired: "danger",
  urgent: "danger",
  soon: "warning",
  ok: "default",
  none: "muted",
  unknown: "muted",
} as const;

export function ProductListTable({ products }: { products: ProductWithRelations[] }) {
  return (
    <div className="rounded-card border border-border bg-surface shadow-card">
      {/* Desktop / tablet: a real compact table. Hidden below sm to avoid
          any risk of horizontal overflow on narrow phones. */}
      <table className="hidden w-full text-left text-sm sm:table">
        <thead>
          <tr className="border-b border-divider text-xs font-medium text-textMuted">
            <th className="px-4 py-2.5 font-medium">商品</th>
            <th className="px-3 py-2.5 font-medium">品牌</th>
            <th className="px-3 py-2.5 text-right font-medium">容量</th>
            <th className="px-3 py-2.5 font-medium">截止日期</th>
            <th className="px-3 py-2.5 text-right font-medium">庫存</th>
            <th className="px-4 py-2.5 text-center font-medium" aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const status = getExpirationStatus(p);
            const capacityText = formatCapacity(p.capacity);
            return (
              <tr key={p.id} className="border-b border-divider last:border-0 hover:bg-surfaceMuted/50">
                <td className="max-w-0 px-4 py-2.5">
                  <p className="truncate font-medium text-textPrimary">{p.name}</p>
                  {p.notes && <p className="note-preview mt-0.5 line-clamp-1 text-xs text-textMuted">{p.notes}</p>}
                </td>
                <td className="max-w-0 truncate px-3 py-2.5 text-textSecondary">{p.brand?.name ?? "—"}</td>
                <td className="px-3 py-2.5 text-right text-textSecondary">{capacityText ?? ""}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={statusTone[status]} className="whitespace-nowrap text-[11px]">
                    {formatExpiration(p)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-right text-textSecondary">×{p.quantity}</td>
                <td className="px-4 py-2.5 text-center text-textMuted">
                  <span role="img" aria-label={p.opened ? "已開封" : "未開封"}>
                    {p.opened ? <PackageOpen size={15} className="mx-auto" /> : <Package size={15} className="mx-auto opacity-50" />}
                  </span>
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
          const capacityText = formatCapacity(p.capacity);
          return (
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-textPrimary">{p.name}</p>
                  {p.brand?.name && <p className="mt-0.5 truncate text-xs text-textSecondary">{p.brand.name}</p>}
                  {p.notes && <p className="note-preview mt-1 line-clamp-2 text-xs text-textMuted">{p.notes}</p>}
                </div>
                <span className="shrink-0 text-textMuted" role="img" aria-label={p.opened ? "已開封" : "未開封"}>
                  {p.opened ? <PackageOpen size={15} /> : <Package size={15} className="opacity-50" />}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={statusTone[status]} className="text-[11px]">{formatExpiration(p)}</Badge>
                <span className="text-xs text-textMuted">
                  {capacityText && `${capacityText} · `}×{p.quantity}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
