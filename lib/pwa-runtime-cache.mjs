/**
 * This callback is serialized into the generated service worker, so it must
 * stay self-contained (no closed-over module variables).
 */
export function isProtectedRuntimeRequest({ url, request }) {
  if (request?.mode === "navigate") return true;

  const pathname = url.pathname;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/data/") ||
    pathname.startsWith("/_next/image") ||
    url.searchParams.has("_rsc") ||
    request?.headers?.get?.("RSC") === "1"
  ) {
    return true;
  }

  return (
    url.hostname.endsWith(".supabase.co") &&
    (pathname.startsWith("/auth/v1/") ||
      pathname.startsWith("/rest/v1/") ||
      pathname.startsWith("/storage/v1/"))
  );
}

export const inventoryRuntimeCaching = [
  {
    urlPattern: isProtectedRuntimeRequest,
    handler: "NetworkOnly",
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "public-google-fonts-webfonts",
      expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "public-google-fonts-stylesheets",
      expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: ({ url }) =>
      url.origin === self.location.origin && url.pathname.startsWith("/_next/static/"),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "public-next-static",
      expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: ({ url }) =>
      url.origin === self.location.origin &&
      (url.pathname === "/manifest.json" ||
        url.pathname === "/favicon.ico" ||
        url.pathname.startsWith("/icons/") ||
        url.pathname.startsWith("/splash/")),
    handler: "CacheFirst",
    options: {
      cacheName: "public-app-assets",
      expiration: { maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
];

