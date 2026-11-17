"use client";

export const PRODUCT_FORM_OPEN_EVENT = "beauty-inventory:product-form-open";
export const PRODUCT_FORM_REFRESH_MARK = "beauty-inventory:product-save-refresh";

export type ProductFormRequest =
  | { mode: "new" }
  | { mode: "edit" | "duplicate"; productId: string };

export function openProductForm(request: ProductFormRequest) {
  window.dispatchEvent(new CustomEvent<ProductFormRequest>(PRODUCT_FORM_OPEN_EVENT, { detail: request }));
}
