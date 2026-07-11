# Changelog

## Phase 2C — dynamic product summary
- The "共 X 件商品" line above the product list now also shows total
  capacity: "共 X 件商品 ・ 總容量 XXX". Computed with `useMemo` directly
  from `sorted` — the same filtered/sorted array already rendered below
  — so no extra query, and it updates live with search/category/
  subcategory/brand/opened-status changes.
- Capacity is summed only over products with a real capacity set
  (`capacity != null && capacity > 0`); products with an empty capacity
  are skipped, not treated as 0. If nothing currently on screen has a
  capacity, the total shows "—" instead of "0".

## Phase 2B — simplify product data & UX
- Removed Tags entirely: field, badges, filter, admin management page,
  and nav link. `tags`/`product_tags` DB tables left in place (unused)
  rather than dropped.
- Removed Favorite entirely: field, icon/button, filter, and any
  favorite-based sorting/toggle logic.
- Added a single optional numeric `capacity` field (no unit column, no
  unit displayed) to products, forms, and the admin table.
- Admin Categories page now shows a live product-count + total-capacity
  summary per subcategory.
- Category/Subcategory kept in the database, admin panel, search, and
  filter — removed from product cards and the list view specifically.
- Notes now display on the frontend (card + list) whenever present,
  hidden entirely when empty.
- Replaced the Favorite heart icon's screen position with a
  non-interactive Package/PackageOpen icon reflecting the existing
  `opened` boolean — icon only, no label/tooltip/badge.
- Fixed leftover English strings in `formatExpiration` /
  `formatCategoryPath` that were missed in the Phase 2 localization pass.
- New `supabase/phase-2b-migration.sql` for existing databases (adds
  `capacity`, drops `is_favorite`); `schema.sql` updated for fresh
  installs.

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
