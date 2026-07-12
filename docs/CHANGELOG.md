# Changelog

## Phase 4A (fine-tune) — typography & spacing pass
- Card grid gap: 14px → 28px (`gap-3.5` → `gap-7`), both directions, to
  match Birthday Rewards' breathing room.
- Card padding: 20px → 28px (`p-5` → `p-7`).
- Title: `text-base` (16px) → `text-[15px]`, font family and letter
  spacing unchanged.
- Notes line-height: `leading-relaxed` (1.625) → `leading-[1.6]`.
- Labels (品牌/容量): left as `text-xs` / `font-medium` /
  `text-textMuted` — already matched the "subtle, not bold, medium
  gray, values stay stronger" ask from the previous pass, so nothing to
  change. Kept the shared `textMuted` token rather than hardcoding the
  suggested `#8f887f` (already a close match, and a one-off hex here
  would undercut the whole "no hardcoded values, reference the design
  system" point of Phase 3E) — flagged rather than silently substituted.

## Phase 4A (final) — product card matched to mockup
- Card radius changed to the explicitly specified 12px (shared
  `--radius-card` token, was 14px) — this time the brief gave an exact,
  unambiguous value as "the design specification," unlike the earlier
  generic radius recommendations that conflicted with "don't redesign."
- Product title now uses a dedicated CJK serif stack (`"Songti SC",
  "Apple LiSong", "Noto Serif TC", serif` — new `--font-serif-cjk`
  token), regular/medium weight (not bold), `tracking-[0.05em]`. Noto
  Serif TC is loaded as a plain `<link>` stylesheet (not `next/font`,
  to avoid guessing at a Google Fonts subset name we can't verify
  without a live fetch) as a fallback for non-Apple platforms; on
  macOS/iOS the system fonts are used directly. Every other card string
  stays on the existing sans-serif.
- Added a hairline (`border-t-[0.5px]`) divider between title and
  content.
- Product image bumped from 88px to 120px (`productImageSize` in
  `lib/theme.ts`, its only consumer) to match the mockup's proportions,
  white background instead of the previous accent-tinted one, border
  and corner radius unchanged.
- Volume and Stock are now on one row: Volume as a plain label/value
  (hidden together if not set), Stock immediately after as a small
  fixed-size rounded-rectangle badge (no "庫存" label) — always shown,
  even when Volume isn't set.
- Notes moved into the same column as Brand/Volume (not spanning the
  full card width under the image), `line-clamp-3`, hidden completely
  when empty.
- Expiration (📅 2028.06.30, still neutral/no urgency color) and the
  Package/PackageOpen status icon now share the bottom row, aligned
  left/right — the status icon is back after being removed in the
  previous pass, per this mockup's explicit "keep the package icon"
  instruction.

## Phase 4A (superseded) — product card polish
- Rebuilt `ProductCardGrid`'s internal layout only (still a `HoverCard`,
  still 88px image, still no redesign): Name full-width at the top
  (bumped to `font-bold` as the clear focal point), then an image-left /
  info-right row, then Notes only when present, then a plain
  (non-colored) expiration date pinned to the bottom-left with a
  calendar icon.
- Brand/Volume(capacity)/Stock(quantity) are now a plain label→value
  list — no badge/background/border, lighter-gray label, darker+bold
  value, all rows left-aligned on a shared label column so they line up
  neatly. Rows are hidden individually when empty (brand, capacity) —
  quantity always has a value so it always shows.
- Volume and Stock show only the bare number (no unit, no "×", no "Qty
  ") — reuses the existing `formatCapacity` (still hides 0/empty) and
  just prints `quantity` directly.
- New `formatExpirationCompact` in `lib/utils.ts`: dot-notation
  `2028.06.30`, same 無期限/未知 fallbacks as `formatExpiration`, no
  "(expired)" suffix and no urgency-colored badge — this card
  intentionally shows the date plainly. `getExpirationStatus` /
  `formatExpiration` are untouched and still drive the colored badges
  in the list view and admin table.
- Removed the Opened/Unopened status icon from this card (it occupied
  the same top-right slot the old Favorite heart used to, and isn't
  part of the new information hierarchy) — the underlying `opened` data
  and its display elsewhere (list view, admin) are unaffected.
- Left the shared radius tokens (button/input/dropdown = pill/12px,
  card = 14px) as they are. The brief's "Buttons 10px / Inputs 10px /
  Dropdowns 10px" would mean re-shaping every button and form control
  app-wide — out of scope for a phase scoped to "only polish the card,"
  and in tension with "keep the existing visual language." Card radius
  (14px) is already close enough to the requested 12px that changing
  the shared token wasn't worth the ripple risk. Happy to revisit either
  as its own explicit phase.

## Phase 3F — sorting UI polish
- Trimmed sort options to four: 效期 (default), 品牌, 更新, 庫存. Removed
  商品名稱 and 新增日期 (`SortField` type, the sort switch-case in
  `product-explorer.tsx`, and the now-fully-dead `SortDirection`/
  `SortOption` types that were never actually used anywhere).
- Sort trigger now shows only the selected field's name — no direction
  ("近→遠", "A→Z", …) ever surfaces in the UI; direction stays internal
  to the sort logic.
- Rebuilt as a self-contained dropdown (not the shared `Dropdown` used
  by the filter dialog, since this phase was scoped to "only the
  sorting component" — the filter dialog's look/behavior is untouched):
  macOS-menu styling (rounded corners, soft shadow, comfortable inset
  padding, hover highlight), checkmark on the left of the selected item
  only, click an option to apply it and close immediately, fade-only
  animation (no slide/scale/bounce).

## Phase 3E — global design system
- Root-caused and fixed the focus-ring radius bug: the global
  `:focus-visible` rule was force-applying `border-radius: 4px` to every
  focused element regardless of its real shape. Removed that override
  and switched to a semi-transparent focus ring color, applied globally
  (buttons, inputs, search, dropdowns, toolbar, admin forms) with no
  per-component overrides anywhere.
- Centralized radius/shadow/duration/typography as CSS variables in
  `globals.css` (same pattern colors already used), wired into
  `tailwind.config.ts`. All values unchanged from before — architecture
  only, no visual redesign. Added `lib/design-system.ts` as the JS-side
  mirror (re-exports `lib/theme.ts`, adds radius/typography/shadow/
  animation constants).
- New shared components: `components/ui/card.tsx` (Card/HoverCard),
  `dialog.tsx`, `dropdown.tsx` (Dropdown/DropdownField), and
  `toolbar-button.tsx`.
- Replaced native `<select>` with the custom `Dropdown` in the Sort
  control (now icon-only, selected value shown only inside the popup)
  and all four filter-dialog selects.
- Adopted `Card`/`HoverCard` in product cards, the list-view table, and
  the admin product table.
- Fixed in passing: product-card image placeholder was reading
  `theme.light.*` directly, ignoring dark mode; login form still
  mentioned Tags (removed in Phase 2B).

## Phase 3D — toolbar polish (visual only, no functional changes)
- Removed the left sort icon from the Sort control — just the label and
  the select's own native dropdown arrow now.
- View toggle (List/Card) is now truly icon-only, no text labels at any
  breakpoint, per the "compact segmented control" spec.
- Removed the focus-visible outline/ring specifically on the toolbar
  controls (Filter trigger, Sort select, View toggle buttons) via
  `focus:outline-none focus-visible:outline-none focus-visible:ring-0`
  on those elements only — the global `:focus-visible` accent outline in
  `globals.css` is untouched everywhere else (forms, buttons elsewhere),
  so accessibility outside the toolbar is unaffected.
- Toolbar row 2 restructured to `Filter + Sort` grouped on the left
  (shrinkable, no wrap) and the view toggle pinned to the right via
  `justify-between` + `flex-nowrap`, instead of the previous
  flex-wrap row — same controls, same behavior, just aligned per spec.

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
