"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryAccent, theme } from "@/lib/theme";
import { cn, formatCategoryPath, formatExpiration, getExpirationStatus, initials } from "@/lib/utils";
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
  onToggleFavorite,
  categoryIndex = 0,
}: {
  product: ProductWithRelations;
  onToggleFavorite?: (id: string, next: boolean) => void;
  categoryIndex?: number;
}) {
  const status = getExpirationStatus(product);

  return (
    <div className="flex gap-3 rounded-card border border-border bg-surface p-3 shadow-card transition-shadow hover:shadow-cardHover">
      <div
        className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border"
        style={{ borderColor: theme.light.border, backgroundColor: theme.light.accentSoft }}
      >
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill sizes="76px" className="object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-sm font-semibold"
            style={{ color: categoryAccent(categoryIndex) }}
          >
            {initials(product.brand?.name || product.name)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-textPrimary">{product.name}</h3>
          <button
            type="button"
            aria-label={product.is_favorite ? "Remove favorite" : "Mark favorite"}
            onClick={() => onToggleFavorite?.(product.id, !product.is_favorite)}
            className={cn("shrink-0 text-textMuted transition-colors hover:text-danger", product.is_favorite && "text-danger")}
          >
            <Heart size={15} fill={product.is_favorite ? "currentColor" : "none"} />
          </button>
        </div>

        <p className="mt-0.5 truncate text-xs text-textSecondary">
          {formatCategoryPath(product.category?.name, product.subcategory?.name)}
        </p>
        {product.brand && <p className="truncate text-xs text-textMuted">{product.brand.name}</p>}

        {product.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((t) => (
              <Badge key={t.id}>{t.name}</Badge>
            ))}
            {product.tags.length > 3 && <Badge tone="muted">+{product.tags.length - 3}</Badge>}
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between">
          <Badge tone={statusTone[status]} className="text-[11px]">{formatExpiration(product)}</Badge>
          <span className="text-xs text-textMuted">Qty {product.quantity}</span>
        </div>
      </div>
    </div>
  );
}
