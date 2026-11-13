"use client";

import Image from "next/image";
import { Calendar } from "lucide-react";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Card } from "@/components/ui/card";
import { ProductActionsMenu } from "@/components/product-actions-menu";
import { ProductSwipeActions } from "@/components/product-swipe-actions";
import { protectedProductImageUrl } from "@/lib/product-image-path";
import { categoryAccent, productImageSize } from "@/lib/theme";
import { formatCapacity, formatExpirationCompact, initials } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/types";

const SWIPE_ACTION_WIDTH = 192;
const SWIPE_DIRECTION_THRESHOLD = 8;

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
  swipeOpen = false,
  onSwipeOpen,
  onSwipeClose,
}: {
  product: ProductWithRelations;
  categoryIndex?: number;
  onOpen: () => void;
  onDeleted?: () => void;
  swipeOpen?: boolean;
  onSwipeOpen?: () => void;
  onSwipeClose?: () => void;
}) {
  const capacityText = formatCapacity(product.capacity);
  const imageSrc = protectedProductImageUrl(product.image_url);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);
  const touchStartRef = useRef({ x: 0, y: 0, baseOffset: 0 });
  const directionRef = useRef<"horizontal" | "vertical" | null>(null);
  const suppressOpenRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateOffset(next: number) {
    offsetRef.current = next;
    setOffset(next);
  }

  useEffect(() => {
    if (dragging) return;
    updateOffset(swipeOpen ? -SWIPE_ACTION_WIDTH : 0);
  }, [dragging, swipeOpen]);

  useEffect(
    () => () => {
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    },
    [],
  );

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (window.matchMedia("(min-width: 640px)").matches) return;
    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      baseOffset: swipeOpen ? -SWIPE_ACTION_WIDTH : 0,
    };
    directionRef.current = null;
    setDragging(false);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (window.matchMedia("(min-width: 640px)").matches) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!directionRef.current) {
      if (Math.max(absX, absY) < SWIPE_DIRECTION_THRESHOLD) return;
      if (absX > absY * 1.2) directionRef.current = "horizontal";
      else if (absY > absX * 1.2) directionRef.current = "vertical";
      else return;
    }

    if (directionRef.current !== "horizontal") return;

    setDragging(true);
    suppressOpenRef.current = true;
    if (deltaX < 0) onSwipeOpen?.();
    const next = Math.max(
      -SWIPE_ACTION_WIDTH,
      Math.min(0, touchStartRef.current.baseOffset + deltaX),
    );
    updateOffset(next);
  }

  function finishTouch() {
    if (directionRef.current === "horizontal") {
      const shouldOpen = offsetRef.current <= -SWIPE_ACTION_WIDTH / 2;
      updateOffset(shouldOpen ? -SWIPE_ACTION_WIDTH : 0);
      if (shouldOpen) onSwipeOpen?.();
      else onSwipeClose?.();

      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = setTimeout(() => {
        suppressOpenRef.current = false;
      }, 250);
    }
    directionRef.current = null;
    setDragging(false);
  }

  function handleCardOpen() {
    if (suppressOpenRef.current) return;
    if (swipeOpen) {
      onSwipeClose?.();
      return;
    }
    onOpen();
  }

  return (
    <div
      className="relative h-full overflow-hidden rounded-card shadow-card sm:overflow-visible sm:shadow-none"
      data-product-swipe-card={product.id}
    >
      <ProductSwipeActions
        product={product}
        onDeleted={onDeleted}
        onComplete={() => onSwipeClose?.()}
        active={swipeOpen}
      />
      <Card
        className="relative z-[1] flex h-full flex-col p-7 shadow-none transition-transform duration-200 ease-out touch-pan-y sm:!translate-x-0 sm:shadow-card"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transitionDuration: dragging ? "0ms" : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishTouch}
        onTouchCancel={finishTouch}
      >
        <ProductActionsMenu
          product={product}
          onDeleted={onDeleted}
          className="absolute right-3 top-3 z-10 hidden sm:block"
        />
        <button type="button" onClick={handleCardOpen} className="flex h-full w-full flex-col text-left" aria-label={`查看 ${product.name} 詳細資訊`}>
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
    </div>
  );
}
