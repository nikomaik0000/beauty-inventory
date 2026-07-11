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
  if (product.expiration_type === "none") return "No expiration";
  if (product.expiration_type === "unknown" || !product.expiration_date) return "Unknown";

  const date = new Date(product.expiration_date);
  const formatted = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const days = daysUntil(product.expiration_date);
  if (days < 0) return `${formatted} (expired)`;
  return formatted;
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
  return categoryName ?? subcategoryName ?? "Uncategorized";
}
