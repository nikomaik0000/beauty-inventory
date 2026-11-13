export const PRODUCT_IMAGE_BUCKET = "product-images";

const STORAGE_MARKERS = [
  `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`,
  `/storage/v1/object/sign/${PRODUCT_IMAGE_BUCKET}/`,
  `/storage/v1/object/authenticated/${PRODUCT_IMAGE_BUCKET}/`,
];

function normalizeObjectPath(value: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }

  const path = decoded.replace(/^\/+/, "");
  if (!path || path.includes("\\") || path.includes("\0")) return null;
  if (path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
  return path;
}

/** Accepts existing public/signed Storage URLs and future stored paths. */
export function extractProductImagePath(value: string | null | undefined): string | null {
  if (!value) return null;

  if (!value.includes("://")) return normalizeObjectPath(value);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const marker = STORAGE_MARKERS.find((candidate) => url.pathname.includes(candidate));
  if (!marker) return null;
  return normalizeObjectPath(url.pathname.slice(url.pathname.indexOf(marker) + marker.length));
}

export function protectedProductImageUrl(value: string | null | undefined): string | null {
  const path = extractProductImagePath(value);
  return path ? `/api/product-images?path=${encodeURIComponent(path)}` : null;
}

