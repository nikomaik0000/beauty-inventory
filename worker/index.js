const LEGACY_PRIVATE_CACHE_NAMES = new Set([
  "others",
  "apis",
  "next-data",
  "next-image",
  "cross-origin",
  "static-data-assets",
  "static-image-assets",
]);

async function clearLegacyPrivateCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => LEGACY_PRIVATE_CACHE_NAMES.has(name))
      .map((name) => caches.delete(name)),
  );
}

// Upgrading an already-installed PWA must remove data cached by the old
// next-pwa defaults even if the person has not pressed the new sign-out button.
self.addEventListener("activate", (event) => {
  event.waitUntil(clearLegacyPrivateCaches());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_INVENTORY_CACHES") {
    event.waitUntil(clearLegacyPrivateCaches());
  }
});

