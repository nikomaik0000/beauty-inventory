"use client";

import { useState } from "react";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import type { ProductWithRelations } from "@/lib/types";

const mockProduct: ProductWithRelations = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "Modal visual test",
  brand_id: null,
  category_id: null,
  subcategory_id: null,
  image_url: null,
  expiration_type: "unknown",
  expiration_date: null,
  opened: false,
  opened_date: null,
  pao_months: 12,
  capacity: 100,
  quantity: 1,
  notes: "Local-only visual verification. No product data is read or written.",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  brand: null,
  category: null,
  subcategory: null,
};

export function ModalVisualTest() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-button border border-border bg-surface px-5 py-3 text-sm text-textPrimary"
      >
        Open product detail test
      </button>
      <ProductDetailDialog product={open ? mockProduct : null} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
