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

/** Columns: 商品 25% · 品牌 20% · 容量 5% · 效期 15% · 備註 25% · 庫存 5% ·
 * 開封 5%. `table-fixed` + a `<colgroup>` make those percentages actually
 * hold (rather than the browser reflowing columns based on content),
 * which is what makes the `truncate` + ellipsis on every cell reliable —
 * single line, never wraps, fixed row height (h-12) regardless of
 * content. Brand uses the same 14px/500 typography as the card view. */
const COLUMN_WIDTHS = ["25%", "20%", "5%", "15%", "25%", "5%", "5%"];

export function ProductListTable({ products }: { products: ProductWithRelations[] }) {
  return (
    <Card>
      {/* Desktop / tablet: a real compact table. Hidden below sm to avoid
          any risk of horizontal overflow on narrow phones. */}
      <table className="hidden w-full table-fixed text-left text-sm sm:table">
        <colgroup>
          {COLUMN_WIDTHS.map((width, i) => (
            <col key={i} style={{ width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="h-11 border-b border-divider text-xs font-medium text-textMuted">
            <th className="truncate px-4 font-medium">商品</th>
            <th className="truncate px-3 font-medium">品牌</th>
            <th className="truncate px-3 text-right font-medium">容量</th>
            <th className="truncate px-3 font-medium">效期</th>
            <th className="truncate px-3 font-medium">備註</th>
            <th className="truncate px-3 text-right font-medium">庫存</th>
            <th className="truncate px-4 text-center font-medium">開封</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const status = getExpirationStatus(p);
            const capacityText = formatCapacity(p.capacity);
            return (
              <tr key={p.id} className="h-12 border-b border-divider last:border-0 hover:bg-surfaceMuted/50">
                <td className="truncate px-4 align-middle font-medium text-textPrimary">{p.name}</td>
                <td className="truncate px-3 align-middle text-sm font-medium text-textPrimary">{p.brand?.name ?? "—"}</td>
                <td className="truncate px-3 text-right align-middle text-textSecondary">{capacityText ?? ""}</td>
                <td className="px-3 align-middle">
                  <Badge tone={statusTone[status]} className="whitespace-nowrap text-[11px]">
                    {formatExpiration(p)}
                  </Badge>
                </td>
                <td className="truncate px-3 align-middle text-xs text-textSecondary">{p.notes ?? ""}</td>
                <td className="truncate px-3 text-right align-middle text-textSecondary">{p.quantity}</td>
                <td className="px-4 text-center align-middle text-textMuted">
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
                  {p.notes && <p className="mt-1 truncate text-xs text-textSecondary">{p.notes}</p>}
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
