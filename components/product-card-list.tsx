"use client";

import { Heart, PackageOpen } from "lucide-react";
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

export function ProductCardList({
  product,
  onToggleFavorite,
}: {
  product: ProductWithRelations;
  onToggleFavorite?: (id: string, next: boolean) => void;
}) {
  const status = getExpirationStatus(product);

  return (
    <div className="group flex flex-col gap-2 rounded-card border border-border bg-surface px-4 py-3 shadow-card transition-shadow hover:shadow-cardHover sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-textPrimary">{product.name}</h3>
          {product.opened && (
            <span title="Opened" className="text-textMuted">
              <PackageOpen size={13} />
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-textSecondary">
          {formatCategoryPath(product.category?.name, product.subcategory?.name)}
          {product.brand ? ` · ${product.brand.name}` : ""}
        </p>

        {product.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {product.tags.map((t) => (
              <Badge key={t.id}>{t.name}</Badge>
            ))}
          </div>
        )}

        {product.notes && (
          <p className="note-preview mt-1.5 line-clamp-2 text-xs text-textMuted">{product.notes}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5">
        <Badge tone={statusTone[status]}>{formatExpiration(product)}</Badge>
        <div className="flex items-center gap-3">
          <span className="text-xs text-textMuted">Qty {product.quantity}</span>
          <button
            type="button"
            aria-label={product.is_favorite ? "Remove favorite" : "Mark favorite"}
            onClick={() => onToggleFavorite?.(product.id, !product.is_favorite)}
            className={cn(
              "text-textMuted transition-colors hover:text-danger",
              product.is_favorite && "text-danger",
            )}
          >
            <Heart size={16} fill={product.is_favorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}
