# Changelog

## Phase X — image upload rebuild
- Root cause of "Upload failed: Bucket not found": Storage setup was
  bundled into `schema.sql` and never reliably created the bucket on
  every project. Split into a dedicated, idempotent, self-verifying
  `supabase/storage-setup.sql`, with a Dashboard fallback documented in
  the README for setups where the SQL editor can't write to
  `storage.buckets` directly.
- Rebuilt `lib/image-optimize.ts`, `lib/product-images.ts`, and
  `components/admin/image-uploader.tsx` from scratch (not patched):
  pre-upload validation (format, HEIC/HEIF, size, empty file), specific
  friendly error messages per failure mode (missing bucket, permission,
  too large, unsupported format, network), an optimistic local preview
  while processing/uploading, and a non-flickering drag-and-drop zone.
- Bucket is now locked to `image/webp` with a 5MB cap (defense in depth
  — the app only ever uploads a compressed WebP file it just produced).

## Phase 2 — UI polish
- Localized all UI text to Traditional Chinese, keeping only "Beauty
  Inventory" and "Personal Skincare Inventory" in English.
- Replaced the manual Image URL field with a full upload flow: click or
  drag-and-drop, client-side resize-to-800px + WebP conversion, upload to
  the `product-images` Supabase Storage bucket, large preview with
  replace/delete, moved to the top of the product form.
- Every product image surface now uses a fixed 88×88 container with
  `object-fit: contain` (`productImageSize` in `lib/theme.ts`) so bottles
  are never cropped.
- Reordered product info to Name → Brand → Category > Subcategory across
  card and list views.
- Replaced the card-style list view with a compact table
  (`components/product-list-table.tsx`): Product, Brand, Category,
  Expiration, Quantity, Favorite, Opened — matching the Birthday Rewards
  table density, with a stacked-row fallback below `sm` so nothing
  forces horizontal scrolling on a phone.
- Quantity now displays as `×N` instead of `Qty N`.
- Desaturated the color palette (less orange, closer to Birthday
  Rewards' neutral beige), widened spacing and line-height, and bumped
  button/card/form padding for a less crowded feel.
- Mobile responsive audit: toolbar now stacks (search on its own row,
  filters/sort/view-toggle wrapping below), the filter panel is a
  viewport-capped drawer on mobile (max 340px) instead of a dropdown
  that could overflow, the header truncates instead of overflowing, and
  `overflow-x: hidden` is set at the document level as a backstop. The
  admin product table only renders as a real (bounded-scroll) table at
  `lg` and above; iPad Mini and phones get the same stacked-row layout
  as the public list view.

## Phase 1 — initial build
- Scaffolded the app from the Birthday Rewards design brief: Next.js 15,
  React 19, TypeScript, Tailwind, Supabase, PWA, dark mode.
- Categories/subcategories as managed database tables; brands/tags as a
  create-on-first-use vocabulary.
- Homepage with list/card view modes, search, filters, sorting.
- Admin panel behind Supabase auth: product CRUD, category/subcategory,
  brand, and tag management.
