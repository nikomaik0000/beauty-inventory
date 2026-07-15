# Changelog

<<<<<<< HEAD
=======
## Phase 4E.1 — UI polish follow-up
- **Toolbar layout** (`components/admin/data-toolbar.tsx`): replaced
  `order-first sm:order-last` with `ml-auto` on 新增商品 — same visual
  result, but it's real flex spacing instead of a responsive reorder
  trick, so it stays correct if the row ever gets wider and stays easy
  to extend (a new secondary button is just another item before it).
- **Filter dialog layout** (`components/ui/dialog.tsx`): max-height
  85vh → 80vh; added `overflow-hidden` on the outer shell and, more
  importantly, `min-h-0` on the scrollable body. Without `min-h-0` a
  `flex-1` child won't actually shrink to fit — it was expanding past
  its allotted space instead of triggering its own `overflow-y-auto`,
  which is what actually caused "the whole dialog scrolls" (the header
  and footer were already outside the scroll area). Also added an
  optional `contentRef` prop so a caller can use the scroll body as a
  boundary for its own popups (used by the Filter dialog below); no
  other `Dialog` usage is affected since it's optional.
- **Dropdown boundary + keyboard nav** (`components/ui/dropdown.tsx`):
  - Added `boundaryRef`: when set, the popup's open-up/open-down and
    max-height math clips against that element's bounds instead of the
    viewport, so it can no longer render underneath the dialog's fixed
    footer. `FilterPanel` wires its dialog body ref through to all four
    `DropdownField`s (`components/filter-panel.tsx`).
  - Replaced the window-level Escape listener with keyboard handling on
    the trigger's own container (`onKeyDown`), and the Escape handler
    now calls `stopPropagation()`. Previously, opening a Select inside
    the Filter dialog and pressing Escape closed *both* the dropdown
    and the dialog in one press, because both had independent
    window-level listeners; now the dropdown consumes the key first and
    the dialog only sees a second, later Escape press.
  - Added Arrow Up/Down to move a highlighted option and Enter to
    select it, matching native `<select>` behavior. Tab is untouched —
    it already moved focus normally since nothing intercepted it.
- **Filter badge** (`components/ui/toolbar-button.tsx`): fixed 24×24
  circle (`h-6 w-6 rounded-full`) instead of a growable pill, still
  flex-centered; colors unchanged from the prior pass. It already hid
  automatically at count 0.

## Phase 4E — UI polish & filter improvements
- **Select positioning bug fix** (`components/ui/dropdown.tsx`): the
  option list is now portaled to `document.body` and positioned with
  `position: fixed`, computed from the trigger's bounding rect —
  Popper-style "flip": opens downward when there's room, upward when
  there isn't (based on available viewport space above vs. below), and
  its max-height is clamped to whichever space it's using. This is why
  it was clipped by the Filter dialog and showed two scrollbars before:
  the list was `position: absolute` inside the dialog's own
  `overflow-y-auto` content area. Trigger styling is unchanged; only
  the popup's positioning/mounting changed. `SortMenu` is a separate,
  already-self-contained component and wasn't touched.
- **Filter dialog scrolling**: already correct before this phase (the
  Dialog's footer sits outside the scrollable content area) — the
  perceived "whole dialog scrolls" issue was actually the Select
  clipping/double-scrollbar bug above; fixing that resolved this too,
  with no changes needed to `components/ui/dialog.tsx`.
- **Filter badge colors** (`components/ui/toolbar-button.tsx`): the
  active-filter-count badge is now `#DDD5CC` background / `#555555`
  text (the latter already existed as `--color-text-primary`), via a
  new `--color-filter-count-badge-bg` token — kept deliberately
  separate from `--color-badge-*`, which is the unrelated category-tag
  `Badge` component's palette, so this doesn't recolor anything else.
  Size, shape, and position unchanged.
- **Toolbar order/spacing/hierarchy** (`components/admin/
  data-toolbar.tsx`): 新增商品 now sits at the far right after 匯入
  CSV / 匯出 CSV / 下載範例 on desktop (`order-first sm:order-last`,
  so it wraps to the front on narrow widths instead of reordering);
  button gap increased from `gap-2` to `gap-3`. Primary/secondary
  button hierarchy (新增商品 filled, the CSV actions outlined) was
  already in place from Phase 01 and needed no change.

>>>>>>> beauty-inventory-full
## Data Management — CSV import / export
- Added four toolbar buttons on `/admin` beside 新增商品: 匯入 CSV, 匯出
  CSV, 下載範例 — same toolbar/button style, no other UI changes.
- **Export** (`lib/csv.ts`, `lib/csv-import.ts`): downloads
  `beauty-inventory-YYYY-MM-DD.csv`, UTF-8 with BOM (Excel-compatible),
  with a `Version,1` line before the header for future format changes.
  Exports 商品/品牌/分類/容量/庫存/效期/已開封/備註 only — no id, image
  URL, storage path, or timestamps.
- **Filtered export**: `/admin` now has its own Search + Filter row
  (`components/admin/admin-product-manager.tsx`), reusing the existing
  `SearchBar`/`FilterPanel` components as-is. Export scopes to whatever
  is currently visible — search, category, subcategory, brand, and
  opened-status filters all apply; export falls back to every product
  when no filter is active. Import always matches against the *full*
  product set regardless of what's currently filtered, since importing
  should never be scoped by an unrelated view filter.
- **Import**: file picker or drag-and-drop → parse → preview (total /
  new / updated / skipped / invalid rows, with row-numbered reasons) →
  explicit confirm → import → summary (新增/更新/略過/失敗, all four
  counts). Never imports immediately on file selection.
- **Matching**: rows are matched to existing products by 商品 + 品牌
  (case-insensitive). Matches update category, capacity, quantity,
  expiration, opened (and opened_date, computed the same way the
  existing 開封 toggle does), and notes only — subcategory, PAO months,
  and the image are left untouched. Unmatched rows create a new
  product. Brands are created on the fly (reusing `upsertBrandId` from
  `app/actions/products.ts`, now exported); categories must already
  exist — an unrecognized 分類 name fails validation rather than
  silently creating one.
- **Validation**: missing name/brand, non-numeric capacity/quantity,
  invalid date, and unknown category are all caught before import, with
  the offending row number shown. Duplicate 商品+品牌 rows within the
  same file are skipped (first occurrence wins) rather than double-
  processed, and that skipped count now also shows in the final import
  summary, not just the preview. Import never touches images — no
  upload, replace, or delete happens as part of this flow.
- New files: `lib/csv.ts` (RFC4180-ish parse/serialize + BOM download,
  no new dependency), `lib/csv-import.ts` (export row mapping + shared
  validate/match logic used by both the preview and the server action),
  `app/actions/csv-import.ts` (the actual writes), `components/admin/
  admin-product-manager.tsx`, `components/admin/data-toolbar.tsx`,
  `components/admin/csv-import-dialog.tsx`.

## Phase 4C — table redesign, icon standardization, motion/interaction rules
- **Frontend list table**: reordered to 商品·品牌·容量·庫存·效期·備註·開封;
  expiration is now plain text with a calendar glyph (no colored badge)
  everywhere it appears — card, list, admin table. Headers use the
  product title's CJK serif font with letter spacing. Removed the now-
  fully-unused `formatExpiration` (badge/"(expired)"-suffix version)
  from `lib/utils.ts` — every surface uses `formatExpirationCompact` now.
- **Admin table**: dropped 分類 and the 已開封/未開封 text badge from the
  overview (still fully editable per-product, still searchable/
  filterable on the frontend); opened state is icon-only now, same
  Package/PackageOpen icon as everywhere else; same CJK serif headers.
- **Mobile list view**: rebuilt as two visual groups per row — name/
  brand/notes (2-line clamp) on the left, capacity/stock badge/opened
  icon/date stacked on the right — instead of everything in one
  stacked column.
- **Icon standardization**: every Lucide icon now shares `strokeWidth
  1.75` and a default `#555555` color. Rather than force a single 20px
  size everywhere (which would visually break dense contexts — a 20px
  checkmark in a 13px dropdown row, a 20px glyph inside a 24px badge),
  used two consistent tiers: 20px for standalone controls (nav, search,
  filter, sort trigger, view toggle, settings, logout, edit/delete),
  14px for icons embedded in dense/text-adjacent contexts (calendar
  next to a date, opened-status in a table cell, checkmarks in compact
  menus). Both tiers share the same stroke width so they still read as
  one family. `lib/design-system.ts` documents the two tiers and the
  reasoning; the only deliberate exception is the header's decorative
  Sparkles logo mark, which isn't a functional icon.
- **Dividers**: `--color-divider` updated to `#ECE7E0`; the card-title
  divider (and any other 0.5px hairline) is now a plain 1px border —
  `divide-y`/`border` elements elsewhere already default to 1px and
  picked up the new color automatically.
- **Motion/interaction rules made permanent**: `Dropdown`'s and
  `Dialog`'s popup animations simplified to pure opacity fades (no
  scale/translate) — "no enlargement, no shrinking" now holds
  everywhere a popup appears, not just the Sort menu. Removed the
  remaining `focus:border-accent` color shift from `Input`/`Textarea`/
  `Select`/the search box, so focus is now completely visually
  silent app-wide (not just outline-free). Removed row-hover
  background highlighting from both tables — rows no longer change
  color under the cursor.

## Phase 4B — polish, storage correctness, dark mode removal
- **Dark Mode removed**: `next-themes`, `ThemeProvider`, `ThemeToggle`,
  and every `.dark` CSS variable deleted. Light mode only.
- **Focus/hover effects removed**: one global `outline: none` rule for
  all focus states; product cards lost their hover shadow (`HoverCard`
  deleted as dead code).
- **Card layout**: info block now top-aligned (was vertically centered)
  so multi-line Notes can't push Brand/Volume out of position; title
  bumped one size up; more internal spacing throughout.
- **Image replace flow fixed**: old Storage image is now deleted
  server-side, only after a successful DB write (`updateProduct`),
  instead of optimistically client-side before the form was even saved
  — the previous approach could orphan the DB reference on an abandoned
  edit. Shared deletion logic extracted to
  `lib/product-images-server.ts`.
- **Short filenames**: new uploads use `products/<10-char-random>.webp`
  instead of a full UUID at the bucket root.
- **Storage Maintenance** (`/admin/settings`): scan for and delete
  Storage files no longer referenced by any product
  (`app/actions/storage.ts`).
- **List view**: percentage-based column widths (`table-fixed` +
  `<colgroup>`), fixed row height, vertical-centered cells. Admin
  product table got the same treatment specifically to remove a
  horizontal scrollbar at medium-desktop widths.
- **Statistics row**: dropped the "・" bullet separators for plain
  spacing between three independent-feeling stats.
- **Mobile admin nav**: horizontal tab row (Products/Categories/Brands/
  Settings) replacing the stacked vertical list on mobile only; desktop
  unchanged aside from the new Settings entry. Sign-out moved to
  Settings.
- **Border radius consolidated to ~10px** for the card/input/dropdown/
  dialog family (was a mix of 10/12/14px); every one-off `rounded-lg` /
  `rounded-xl` / `rounded-md` switched to the shared `rounded-input`
  token.

## Phase 4B (typography/color/stats/units, previous pass)
- **Global text color**: `--color-text-primary` (light mode) changed
  from `#3A342C` to `#555555`, applied everywhere via the existing
  design-system token (nav, search, toolbar, filters, cards, tables,
  admin, dialogs — no per-component edits needed, that's the point of
  Phase 3E's architecture). Added two new tokens rather than hardcoding
  one-off colors: `--color-text-heading` (`#3A342C`, the *old* primary
  color, now reserved for the product card title so it stays the
  darkest/most prominent element) and `--color-text-label` (`#777777`,
  for the Brand/Volume labels specifically — distinct from the existing
  `textMuted` token, which stays as it was for everything else that
  used it). Dark mode's primary text was left alone — not requested,
  and already appropriately light for a dark background.
- **Card typography**: Brand/Volume labels and values are now both
  14px/500 — same size and weight, differing only by color
  (`textLabel` #777777 vs `textPrimary` #555555, which reads
  correctly darker). Title unchanged (serif, size, tracking, weight).
- **Corrected 總容量**: it was summing volume alone; fixed to volume ×
  stock via a new shared `volumeContribution()` helper in `lib/utils.ts`
  (treats missing/invalid volume or stock as 0) — used by both the
  homepage summary and the admin Categories page's per-subcategory
  summary, so the two can't drift apart again.
- **New 總庫存 stat** (sum of stock) added to the homepage summary.
  Rebuilt as `summaryParts.join(" ・ ")` — an array of pre-formatted
  strings — specifically so a future 即將到期 stat is a one-line
  addition, not a template rewrite. Dropped the previous "—" fallback
  for an all-empty total; the new spec says treat empty as 0, so the
  total is now always a plain number.
- **List view rebuilt** to the new column set: 商品 · 品牌 · 容量 · 效期
  · 備註 · 庫存 · 開封. Notes moved out from under the product name into
  its own single-line, truncated column (row height no longer varies
  with note length). Brand uses the same 14px/500 typography as the
  card view. Stock lost its "×" prefix. The opened-state column now has
  a "開封" header — the icon itself is unchanged, this is a column
  label, not a per-icon tooltip.
- **Removed every remaining unit-like prefix**: the admin product
  table's quantity column (desktop + mobile) also dropped its "×"
  prefix, matching the list/card views.

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
