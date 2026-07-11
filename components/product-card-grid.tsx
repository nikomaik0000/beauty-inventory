"use client";

import Image from "next/image";
import { Package, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryAccent, productImageSize, theme } from "@/lib/theme";
import { formatCapacity, formatExpiration, getExpirationStatus, initials } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/types";

const statusTone = {
  expired: "danger",
  urgent: "danger",
  soon: "warning",
  ok: "default",
  none: "muted",
  unknown: "muted",
} as const;

export function ProductCardGrid({
  product,
  categoryIndex = 0,
}: {
  product: ProductWithRelations;
  categoryIndex?: number;
}) {
  const status = getExpirationStatus(product);
  const capacityText = formatCapacity(product.capacity);

  return (
    <div className="flex h-full gap-3.5 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-cardHover">
      <div
        className="relative shrink-0 overflow-hidden rounded-xl border"
        style={{
          width: productImageSize,
          height: productImageSize,
          borderColor: theme.light.border,
          backgroundColor: theme.light.accentSoft,
        }}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes={`${productImageSize}px`}
            className="object-contain p-1.5"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-sm font-semibold"
            style={{ color: categoryAccent(categoryIndex) }}
          >
            {initials(product.brand?.name || product.name)}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-textPrimary">{product.name}</h3>
          <span className="shrink-0 text-textMuted" role="img" aria-label={product.opened ? "已開封" : "未開封"}>
            {product.opened ? <PackageOpen size={15} /> : <Package size={15} />}
          </span>
        </div>

        {product.brand && <p className="mt-0.5 truncate text-xs text-textSecondary">{product.brand.name}</p>}

        <div className="mt-auto flex items-center justify-between pt-2.5">
          <Badge tone={statusTone[status]} className="text-[11px]">{formatExpiration(product)}</Badge>
          <span className="text-xs text-textMuted">
            {capacityText && `${capacityText} · `}×{product.quantity}
          </span>
        </div>

        {product.notes && (
          <p className="note-preview mt-2 line-clamp-2 text-xs text-textMuted">{product.notes}</p>
        )}
      </div>
    </div>
  );
}
