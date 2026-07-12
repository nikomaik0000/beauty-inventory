"use client";

import { Package, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

/** Columns: 商品 | 品牌 | 容量 | 效期 | 備註 | 庫存 | 開封. Brand uses the
 * same 14px/500 typography as the card view's info rows; Notes gets its
 * own single-line truncated column instead of living under the product
 * name (previously the cause of "note under the name" confusion). */
export function ProductListTable({ products }: { products: ProductWithRelations[] }) {
  return (
    <Card>
      {/* Desktop / tablet: a real compact table. Hidden below sm to avoid
          any risk of horizontal overflow on narrow phones. */}
      <table className="hidden w-full text-left text-sm sm:table">
        <thead>
          <tr className="border-b border-divider text-xs font-medium text-textMuted">
            <th className="px-4 py-2.5 font-medium">商品</th>
            <th className="px-3 py-2.5 font-medium">品牌</th>
            <th className="px-3 py-2.5 text-right font-medium">容量</th>
            <th className="px-3 py-2.5 font-medium">效期</th>
            <th className="px-3 py-2.5 font-medium">備註</th>
            <th className="px-3 py-2.5 text-right font-medium">庫存</th>
            <th className="px-4 py-2.5 text-center font-medium">開封</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const status = getExpirationStatus(p);
            const capacityText = formatCapacity(p.capacity);
            return (
              <tr key={p.id} className="border-b border-divider last:border-0 hover:bg-surfaceMuted/50">
                <td className="max-w-0 truncate px-4 py-2.5 font-medium text-textPrimary">{p.name}</td>
                <td className="max-w-0 truncate px-3 py-2.5 text-sm font-medium text-textPrimary">{p.brand?.name ?? "—"}</td>
                <td className="px-3 py-2.5 text-right text-textSecondary">{capacityText ?? ""}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={statusTone[status]} className="whitespace-nowrap text-[11px]">
                    {formatExpiration(p)}
                  </Badge>
                </td>
                <td className="max-w-0 truncate px-3 py-2.5 text-xs text-textMuted">{p.notes ?? ""}</td>
                <td className="px-3 py-2.5 text-right text-textSecondary">{p.quantity}</td>
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
                  {p.brand?.name && <p className="mt-0.5 truncate text-sm font-medium text-textPrimary">{p.brand.name}</p>}
                  {p.notes && <p className="mt-1 truncate text-xs text-textMuted">{p.notes}</p>}
                </div>
                <span className="shrink-0 text-textMuted" role="img" aria-label={p.opened ? "已開封" : "未開封"}>
                  {p.opened ? <PackageOpen size={15} /> : <Package size={15} className="opacity-50" />}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={statusTone[status]} className="text-[11px]">{formatExpiration(p)}</Badge>
                <span className="text-xs text-textMuted">
                  {capacityText && `${capacityText} · `}{p.quantity}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
