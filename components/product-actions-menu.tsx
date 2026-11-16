"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { deleteProduct } from "@/app/actions/products";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/types";
import { openProductForm } from "@/lib/product-form-events";

type ProductAction = "edit" | "duplicate" | "delete";

export function ProductActionsMenu({
  product,
  onDeleted,
  className,
}: {
  product: ProductWithRelations;
  onDeleted?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAction(action: ProductAction) {
    if (action === "edit") {
      openProductForm({ mode: "edit", productId: product.id });
      return;
    }
    if (action === "duplicate") {
      openProductForm({ mode: "duplicate", productId: product.id });
      return;
    }
    if (!confirm(`確定要刪除「${product.name}」嗎？此操作無法復原。`)) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteProduct(product.id);
        onDeleted?.();
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "刪除失敗，請稍後再試。");
      }
    });
  }

  return (
    <div className={cn("relative", className)} onClick={(event) => event.stopPropagation()}>
      <Dropdown<ProductAction>
        value={"" as ProductAction}
        ariaLabel={`${product.name} 操作`}
        align="right"
        options={[
          { value: "edit", label: "編輯" },
          { value: "duplicate", label: "複製" },
          { value: "delete", label: "刪除" },
        ]}
        onChange={handleAction}
        renderTrigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggle();
            }}
            disabled={pending}
            aria-label={`${product.name} 操作選單`}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-input bg-transparent text-textSecondary transition-colors hover:bg-accentSoft focus-visible:bg-accentSoft focus-visible:outline-none disabled:opacity-50"
          >
            <MoreHorizontal size={14} strokeWidth={1.5} />
          </button>
        )}
      />
      {error && <span className="sr-only" role="alert">{error}</span>}
    </div>
  );
}
