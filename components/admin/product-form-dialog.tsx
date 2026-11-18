"use client";

import { useCallback, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ProductForm } from "@/components/admin/product-form";
import type { Category, ProductWithRelations, Subcategory } from "@/lib/types";

export function ProductFormDialog({ open, mode, product, categories, subcategories, onClose }: {
  open: boolean;
  mode: "new" | "edit" | "duplicate";
  product?: ProductWithRelations;
  categories: Category[];
  subcategories: Subcategory[];
  onClose: () => void;
}) {
  const dirtyRef = useRef(false);
  const title = mode === "edit" ? "編輯商品" : mode === "duplicate" ? "複製商品" : "新增商品";
  const requestClose = useCallback(() => {
    if (dirtyRef.current && !confirm("尚有未儲存的變更，確定要離開嗎？")) return;
    dirtyRef.current = false;
    onClose();
  }, [onClose]);
  const handleSaved = useCallback(() => {
    dirtyRef.current = false;
    onClose();
  }, [onClose]);
  return (
    <Dialog open={open} onClose={requestClose} title={title} maxWidthClassName="max-w-[720px]" maxHeightClassName="max-h-[88dvh]" viewportPaddingClassName="px-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:p-6" bodyClassName="flex overflow-hidden p-0">
      <ProductForm key={`${mode}:${product?.id ?? "new"}`} categories={categories} subcategories={subcategories} product={mode === "edit" ? product : undefined} initialProduct={mode === "duplicate" ? product : undefined} modal onCancel={requestClose} onSaved={handleSaved} onDirtyChange={(value) => { dirtyRef.current = value; }} />
    </Dialog>
  );
}
