"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/actions/products";
import type { ProductWithRelations } from "@/lib/types";

export function ProductSwipeActions({
  product,
  onDeleted,
  onComplete,
  active,
}: {
  product: ProductWithRelations;
  onDeleted?: () => void;
  onComplete: () => void;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleEdit() {
    onComplete();
    router.push(`/admin/products/${product.id}/edit`);
  }

  function handleDelete() {
    if (!confirm(`確定要刪除「${product.name}」嗎？此操作無法復原。`)) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteProduct(product.id);
        onComplete();
        onDeleted?.();
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "刪除失敗，請稍後再試。");
      }
    });
  }

  function handleDuplicate() {
    onComplete();
    router.push(`/admin/products/new?duplicate=${encodeURIComponent(product.id)}`);
  }

  return (
    <div
      className="absolute inset-y-0 right-0 grid w-48 grid-cols-3 overflow-hidden rounded-r-card sm:hidden"
      aria-label={`${product.name} 快速操作`}
      aria-hidden={!active}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleEdit}
        tabIndex={active ? 0 : -1}
        className="flex min-h-11 flex-col items-center justify-center gap-1 bg-accentSoft px-2 text-xs font-medium text-accentStrong"
      >
        <Pencil size={19} strokeWidth={1.8} />
        編輯
      </button>
      <button
        type="button"
        onClick={handleDuplicate}
        tabIndex={active ? 0 : -1}
        className="flex min-h-11 flex-col items-center justify-center gap-1 bg-surfaceMuted px-1 text-xs font-medium text-textSecondary"
      >
        <Copy size={19} strokeWidth={1.8} />
        複製
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        tabIndex={active ? 0 : -1}
        className="flex min-h-11 flex-col items-center justify-center gap-1 bg-dangerSoft px-2 text-xs font-medium text-danger disabled:opacity-50"
      >
        <Trash2 size={19} strokeWidth={1.8} />
        {pending ? "刪除中" : "刪除"}
      </button>
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
