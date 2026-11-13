"use client";

import Image from "next/image";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProductActionsMenu } from "@/components/product-actions-menu";
import { protectedProductImageUrl } from "@/lib/product-image-path";
import { categoryAccent, productImageSize } from "@/lib/theme";
import { formatCapacity, formatExpirationCompact, initials } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/types";

/** Plain label/value row — no badge, background, or border. Same
 * font-size/weight for label and value (14px / 500); only color
 * distinguishes them (`textLabel` #777777 vs `textPrimary` #555555).
 * Label column is a fixed width (both labels are 2 CJK characters) so
 * Brand and Volume values start at the same x position. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm leading-relaxed">
      <span className="w-8 shrink-0 font-medium text-textLabel">{label}</span>
      <span className="truncate font-medium text-textPrimary">{value}</span>
    </div>
  );
}

/** Static — no hover animation (shadow/border/background/scale all stay
 * put), per the "cards should remain completely static" spec. */
export function ProductCardGrid({
  product,
  categoryIndex = 0,
  onOpen,
  onDeleted,
}: {
  product: ProductWithRelations;
  categoryIndex?: number;
  onOpen: () => void;
  onDeleted?: () => void;
}) {
  const capacityText = formatCapacity(product.capacity);
  const imageSrc = protectedProductImageUrl(product.image_url);

  return (
    <Card className="relative flex h-full flex-col p-7">
      <ProductActionsMenu product={product} onDeleted={onDeleted} className="absolute right-3 top-3 z-10" />
      <button type="button" onClick={onOpen} className="flex h-full w-full flex-col text-left" aria-label={`查看 ${product.name} 詳細資訊`}>
        <h3 className="w-full truncate pr-8 text-lg font-medium leading-snug tracking-[0.05em] text-textHeading">
          {product.name}
        </h3>

        <div className="mt-4 w-full border-t border-divider" />

      {/* items-start (not center): the info column always aligns to the
          top of the image, even when Notes pushes it to 2-3 lines. */}
        <div className="mt-6 flex w-full items-start gap-4">
        <div
          className="relative shrink-0 overflow-hidden rounded-input border border-border bg-surface"
          style={{ width: productImageSize, height: productImageSize }}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              unoptimized
              sizes={`${productImageSize}px`}
              className="object-contain p-2"
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

        <div className="flex min-w-0 flex-1  flex-col gap-3">
          {product.brand && <InfoRow label="品牌" value={product.brand.name} />}

          <div className="flex items-center gap-2 text-sm leading-relaxed">
            {capacityText ? (
              <>
                <span className="w-8 shrink-0 font-medium text-textLabel">容量</span>
                <span className="truncate font-medium text-textPrimary">{capacityText}</span>
              </>
            ) : (
              <span className="w-8 shrink-0" />
            )}
            <span className="ml-1 flex h-6  min-w-[22px] text-xs shrink-0 items-center justify-center rounded-input bg-surfaceMuted px-1.5 text-xs font-medium text-textSecondary">
              {product.quantity}
            </span>
          </div>

          {product.notes && (
            <p className="line-clamp-3 text-xs leading-[1.6] text-textSecondary">{product.notes}</p>
          )}
        </div>
        </div>

        <div className="mt-auto flex w-full items-center pt-6 text-xs text-textSecondary">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} strokeWidth={1.75} />
            <span>{formatExpirationCompact(product)}</span>
          </div>
        </div>
      </button>
    </Card>
  );
}
