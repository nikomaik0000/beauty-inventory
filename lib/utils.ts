import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { expirationThresholds } from "./theme";
import type { Product } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type ExpirationStatus = "expired" | "urgent" | "soon" | "ok" | "none" | "unknown";

export function getExpirationStatus(product: Pick<Product, "expiration_type" | "expiration_date">): ExpirationStatus {
  if (product.expiration_type === "none") return "none";
  if (product.expiration_type === "unknown") return "unknown";
  if (!product.expiration_date) return "unknown";

  const days = daysUntil(product.expiration_date);
  if (days < 0) return "expired";
  if (days <= expirationThresholds.urgentDays) return "urgent";
  if (days <= expirationThresholds.soonDays) return "soon";
  return "ok";
}

export function isExpiringSoon(product: Pick<Product, "expiration_type" | "expiration_date">): boolean {
  const status = getExpirationStatus(product);
  return status === "expired" || status === "urgent" || status === "soon";
}

export function formatExpiration(product: Pick<Product, "expiration_type" | "expiration_date">): string {
  if (product.expiration_type === "none") return "無期限";
  if (product.expiration_type === "unknown" || !product.expiration_date) return "未知";

  const date = new Date(product.expiration_date);
  const formatted = date.toLocaleDateString("zh-Hant", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const days = daysUntil(product.expiration_date);
  if (days < 0) return `${formatted}（已過期）`;
  return formatted;
}

/** Compact "2028.06.30" style date, with the same 無期限/未知 fallbacks
 * as formatExpiration — used on the product card, which deliberately
 * shows the date plainly (no "(expired)" suffix, no urgency framing;
 * that's still handled separately by getExpirationStatus wherever a
 * status color is actually wanted, e.g. the list view). */
export function formatExpirationCompact(product: Pick<Product, "expiration_type" | "expiration_date">): string {
  if (product.expiration_type === "none") return "無期限";
  if (product.expiration_type === "unknown" || !product.expiration_date) return "未知";

  const date = new Date(product.expiration_date);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

/** Plain number, no unit — 0/empty is treated as "not set" and should
 * never be displayed (matches the product form: leaving Capacity empty
 * shows nothing rather than a 0). */
export function formatCapacity(capacity: number | null | undefined): string | null {
  if (capacity == null || capacity <= 0) return null;
  return String(capacity);
}

/** Computes a projected "use by" date from an opened date + PAO window,
 * for display as a secondary hint alongside the printed expiration date. */
export function projectedPaoExpiry(openedDateIso: string, paoMonths: number): string {
  const d = new Date(openedDateIso);
  d.setMonth(d.getMonth() + paoMonths);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatCategoryPath(categoryName?: string | null, subcategoryName?: string | null): string {
  if (categoryName && subcategoryName) return `${categoryName} > ${subcategoryName}`;
  return categoryName ?? subcategoryName ?? "未分類";
}
