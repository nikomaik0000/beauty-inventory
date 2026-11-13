"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/quantity-stepper";
import { ProductActionsMenu } from "@/components/product-actions-menu";
import { protectedProductImageUrl } from "@/lib/product-image-path";
import { formatCapacity, formatExpirationCompact, initials } from "@/lib/utils";
import { categoryAccent, productImageSize } from "@/lib/theme";
import type { ProductWithRelations } from "@/lib/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 border-b border-divider py-3 last:border-0">
      <dt className="text-xs font-medium text-textMuted">{label}</dt>
      <dd className="min-w-0 text-sm text-textPrimary">{children}</dd>
    </div>
  );
}

export function ProductDetailDialog({
  product,
  open,
  onClose,
}: {
  product: ProductWithRelations | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!product) return null;
  const imageSrc = protectedProductImageUrl(product.image_url);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="商品詳細資訊"
      maxWidthClassName="max-w-lg"
      maxHeightClassName="max-h-[85dvh]"
      viewportPaddingClassName="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      backdropClassName="bg-black/80"
      animated={false}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <ProductActionsMenu product={product} onDeleted={onClose} />
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>關閉</Button>
            <Link
              href={`/admin/products/${product.id}/edit`}
              className="inline-flex h-8 items-center gap-1.5 rounded-button border border-border bg-divider px-3.5 text-sm font-medium text-textPrimary"
            >
              <Pencil size={14} strokeWidth={1.75} />
              編輯
            </Link>
          </div>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className="relative shrink-0 overflow-hidden rounded-input border border-border bg-surface"
          style={{ width: productImageSize, height: productImageSize }}
        >
          {imageSrc ? (
            <Image src={imageSrc} alt={product.name} fill unoptimized sizes={`${productImageSize}px`} className="object-contain p-2" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold" style={{ color: categoryAccent(0) }}>
              {initials(product.brand?.name || product.name)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-textHeading">{product.name}</h2>
          {product.brand?.name && <p className="mt-1 text-sm text-textSecondary">{product.brand.name}</p>}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-textMuted">
            <Calendar size={14} strokeWidth={1.75} />
            {formatExpirationCompact(product)}
          </div>
        </div>
      </div>

      <section className="rounded-card border border-border bg-surfaceMuted/35 p-4">
        <p className="mb-3 text-xs font-medium text-textSecondary">商品總庫存</p>
        <QuantityStepper productId={product.id} quantity={product.quantity} />
      </section>

      <dl>
        <DetailRow label="分類">{product.category?.name ?? "未分類"}</DetailRow>
        <DetailRow label="小分類">{product.subcategory?.name ?? "—"}</DetailRow>
        <DetailRow label="容量">{formatCapacity(product.capacity) ?? "—"}</DetailRow>
        <DetailRow label="效期">{formatExpirationCompact(product)}</DetailRow>
        <DetailRow label="開封後期限">
          {Number.isInteger(product.pao_months) && (product.pao_months ?? 0) > 0
            ? `${product.pao_months} 個月`
            : "未設定"}
        </DetailRow>
        <DetailRow label="備註">
          <span className="whitespace-pre-wrap break-words">{product.notes || "—"}</span>
        </DetailRow>
      </dl>
    </Dialog>
  );
}
