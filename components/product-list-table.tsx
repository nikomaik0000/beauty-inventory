"use client";

import { Calendar, Package, PackageOpen } from "lucide-react";
import { formatCapacity, formatExpirationCompact } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { ProductWithRelations } from "@/lib/types";

/** Desktop columns: 商品 26% · 品牌 18% · 容量 10% · 庫存 10% · 效期 15% ·
 * 備註 16% · 開封 5%. `table-fixed` + a `<colgroup>` make those
 * percentages actually hold, which is what makes `truncate` reliable —
 * single line, ellipsis on overflow, fixed row height regardless of
 * content. Headers use the same CJK serif family as the product title,
 * with a touch of letter spacing. Expiration is now plain text with a
 * calendar glyph (no colored badge) to match the card view. */
const COLUMN_WIDTHS = ["26%", "18%", "10%", "10%", "15%", "16%", "5%"];

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
          <tr className="h-11 border-b border-divider text-xs font-medium tracking-wide text-textMuted">
            <th className="truncate px-4 font-medium" style={{ fontFamily: "var(--font-serif-cjk)" }}>商品</th>
            <th className="truncate px-3 font-medium" style={{ fontFamily: "var(--font-serif-cjk)" }}>品牌</th>
            <th className="truncate px-3 text-right font-medium" style={{ fontFamily: "var(--font-serif-cjk)" }}>容量</th>
            <th className="truncate px-3 text-right font-medium" style={{ fontFamily: "var(--font-serif-cjk)" }}>庫存</th>
            <th className="truncate px-3 font-medium" style={{ fontFamily: "var(--font-serif-cjk)" }}>效期</th>
            <th className="truncate px-3 font-medium" style={{ fontFamily: "var(--font-serif-cjk)" }}>備註</th>
            <th className="truncate px-4 text-center font-medium" style={{ fontFamily: "var(--font-serif-cjk)" }}>開封</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const capacityText = formatCapacity(p.capacity);
            return (
              <tr key={p.id} className="h-12 border-b border-divider last:border-0">
                <td className="truncate px-4 align-middle font-medium text-textPrimary">{p.name}</td>
                <td className="truncate px-3 align-middle text-sm font-medium text-textPrimary">{p.brand?.name ?? "—"}</td>
                <td className="truncate px-3 text-right align-middle text-textSecondary">{capacityText ?? ""}</td>
                <td className="truncate px-3 text-right align-middle text-textSecondary">{p.quantity}</td>
                <td className="truncate px-3 align-middle text-textSecondary">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} strokeWidth={1.75} />
                    {formatExpirationCompact(p)}
                  </span>
                </td>
                <td className="truncate px-3 align-middle text-xs text-textSecondary">{p.notes ?? ""}</td>
                <td className="px-4 text-center align-middle text-textMuted">
                  <span role="img" aria-label={p.opened ? "已開封" : "未開封"}>
                    {p.opened ? <PackageOpen size={16} strokeWidth={1.75} className="mx-auto" /> : <Package size={16} strokeWidth={1.75} className="mx-auto opacity-50" />}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile: each row forms two visual groups — name/brand/notes on
          the left, capacity/stock/opened/date stacked on the right —
          rather than everything stacked in one column. */}
      <ul className="divide-y divide-divider sm:hidden">
        {products.map((p) => {
          const capacityText = formatCapacity(p.capacity);
          return (
            <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-textPrimary">{p.name}</p>
                {p.brand?.name && <p className="mt-0.5 truncate text-xs text-textSecondary">{p.brand.name}</p>}
                {p.notes && <p className="line-clamp-2 mt-1 text-xs text-textSecondary">{p.notes}</p>}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {capacityText && (
                  <span className="text-xs text-textSecondary">
                    <span className="text-textLabel">容量</span> {capacityText}
                  </span>
                )}
                <span className="flex h-6 min-w-[28px] items-center justify-center rounded-input bg-surfaceMuted px-1.5 text-xs font-medium text-textSecondary">
                  {p.quantity}
                </span>
                <span className="text-textMuted" role="img" aria-label={p.opened ? "已開封" : "未開封"}>
                  {p.opened ? <PackageOpen size={14} strokeWidth={1.75} /> : <Package size={14} strokeWidth={1.75} className="opacity-50" />}
                </span>
                <span className="flex items-center gap-1 text-xs text-textSecondary">
                  <Calendar size={12} strokeWidth={1.75} />
                  {formatExpirationCompact(p)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
