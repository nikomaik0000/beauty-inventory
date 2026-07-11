export type ExpirationType = "dated" | "none" | "unknown";

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  image_url: string | null;
  expiration_type: ExpirationType;
  expiration_date: string | null; // ISO date, only when expiration_type === "dated"
  opened: boolean;
  opened_date: string | null;
  pao_months: number | null; // Period After Opening, in months
  capacity: number | null; // plain number, unit intentionally omitted — personal use only
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Product joined with its relations, as returned by the list/detail queries. */
export interface ProductWithRelations extends Product {
  brand: Brand | null;
  category: Category | null;
  subcategory: Subcategory | null;
}

export type ViewMode = "list" | "card";

export type SortField =
  | "expiration"
  | "brand"
  | "name"
  | "created_at"
  | "updated_at"
  | "quantity";

export type SortDirection = "asc" | "desc";

export interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

export interface ProductFilters {
  search: string;
  categoryId: string | null;
  subcategoryId: string | null;
  brandId: string | null;
  openedStatus: "all" | "opened" | "unopened";
  expiringSoonOnly: boolean;
}

export const defaultFilters: ProductFilters = {
  search: "",
  categoryId: null,
  subcategoryId: null,
  brandId: null,
  openedStatus: "all",
  expiringSoonOnly: false,
};
