# Beauty Inventory

Personal Skincare Inventory — a standalone app in the same warm, minimal
design family as Birthday Rewards, for tracking your skincare collection:
expiration dates, opened status, PAO windows, capacity, and brands.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase ·
React Hook Form + Zod · TanStack Table · Framer Motion · Lucide Icons ·
next-pwa (installable app)

Light mode only — Dark Mode was deliberately removed (see "Phase 4B notes").

## 1. Create the Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql`. This creates every
   table (`categories`, `subcategories`, `brands`, `tags`, `products`,
   `product_tags`), indexes, the `updated_at` trigger, row-level security
   policies (public read, authenticated write), and seeds the starter
   Face / Body / Hair categories from the brief.
3. Under **Authentication → Users**, add yourself as a user (email +
   password). This is the account you'll sign in with at `/login` to
   reach the admin panel — there's intentionally no public sign-up.
4. Set up Storage for product images — see the dedicated section below.
   Skipping this step is the #1 cause of "Upload failed: Bucket not
   found" — the image uploader will not work until it's done.
5. If you already have a database from before Phase 2B (Tags removed,
   Favorite removed, Capacity added), run
   `supabase/phase-2b-migration.sql` once. Fresh installs don't need
   this — `schema.sql` already includes `capacity`.

## 2. Supabase Storage setup (required for product images)

The product image uploader needs one Storage bucket, `product-images`,
plus four policies on it. Follow this exactly once and it's done for the
life of the project.

### Step 1 — Run the setup script

Open the Supabase SQL editor and run `supabase/storage-setup.sql` in
full. It:

1. Creates the `product-images` bucket — public, restricted to
   `image/webp` (what the app always uploads), 5MB cap.
2. Runs a `select` immediately after so you can confirm the bucket row
   actually exists (the query result should show one row named
   `product-images`).
3. Drops and recreates the four Storage policies (`select`, `insert`,
   `update`, `delete` on `storage.objects` for that bucket): public read,
   authenticated-only write.

The whole script is idempotent — every statement uses `on conflict` or
`drop ... if exists`, so if anything didn't take effect, just run the
whole file again.

### Step 2 — If the bucket still doesn't show up

Some Supabase projects/roles don't allow the SQL editor to insert
directly into `storage.buckets`. If the `select` at the end of step 1
returns **zero rows**, create the bucket from the Dashboard instead:

1. **Storage** (left sidebar) → **New bucket**.
2. Name: `product-images` (must match exactly).
3. Toggle **Public bucket** on.
4. Save.
5. Re-run just section 3 of `supabase/storage-setup.sql` (the four
   `drop policy` / `create policy` statements) to attach the read/write
   policies to the bucket you just created by hand.

### Step 3 — Environment variables

No extra environment variables are needed for Storage — it uses the
same `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
step 2 below. Uploads happen from the signed-in admin's browser session
using those.

### Step 4 — Test the upload

1. Sign in at `/login`, go to **商品 → 新增商品** (Products → Add
   product).
2. Click the image area, or drag an image file onto it.
3. You should see a short "處理圖片中… / 上傳中…" (processing / uploading)
   state, then the image itself.
4. Click 更換圖片 (replace) to upload a different image — the old one is
   deleted from Storage automatically.
5. Click 刪除圖片 (delete) to clear it.
6. Save the product, reload the page, and confirm the image is still
   there (this proves the public URL was written to the `products` row
   and is actually reachable, not just cached locally).

If step 2 fails with a "找不到圖片儲存空間" (bucket not found) message,
the bucket setup above wasn't completed — go back to Step 1/2. If it
fails with a permission message, make sure you're signed in at `/login`
(uploads require an authenticated session, same as every other write in
this app).

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
from your Supabase project's **Settings → API** page.

## 4. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the inventory, and `/login` to sign in
to `/admin`.

Other scripts: `npm run build`, `npm run start`, `npm run lint`,
`npm run typecheck`.

## 5. Add PWA icons

Drop `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png` into
`public/icons/` (see `public/icons/README.txt`). `manifest.json` already
references them; without them the app still works, it just won't have a
home-screen icon when installed.

## How it's organized

- **Design system** — `app/globals.css` is the single source of truth:
  every color, border radius, shadow, and transition duration used
  anywhere in the app is a CSS variable defined there (light mode
  only — see "Phase 4B notes" for why there's no dark-mode pair
  anymore). `tailwind.config.ts` wires those variables into
  Tailwind class names (`bg-accent`, `rounded-card`, `shadow-dropdown`,
  `duration-base`, …) — it holds no literal color/radius/shadow values
  itself. `lib/theme.ts` keeps the color tokens as a typed JS object for
  the few places that need one (e.g. category accent colors); `lib/
  design-system.ts` re-exports that and adds the radius/typography/
  shadow/animation side as plain JS/TS, mirroring the CSS variables for
  things like Framer Motion transitions that can't read a CSS custom
  property directly. Changing a value in `globals.css` (and its JS twin
  in `design-system.ts` for animation durations) updates the whole app.
  No component should hardcode a hex value, shadow, or arbitrary
  Tailwind bracket value — reach for a token instead.
  *(The phase that introduced this suggested a `src/styles/` +
  `src/components/ui/` layout; this project never had a `src/`
  directory, so the same idea was adapted to fit where the code already
  lives — tokens in `lib/`, shared components in `components/ui/` —
  rather than restructuring the whole app to introduce one.)*
- **Shared UI components** (`components/ui/`) — `button.tsx`, `input.tsx`
  (Input/Textarea/Select), `badge.tsx`, `card.tsx` (Card/HoverCard),
  `dialog.tsx` (the centered-modal chrome, used by the filter dialog),
  `dropdown.tsx` (Dropdown + DropdownField — the custom popup that
  replaced native `<select>` in the toolbar and filter dialog), and
  `toolbar-button.tsx` (the shared Filter/Sort trigger shape). These are
  what the app should reach for instead of styling a one-off control
  per page.
- `lib/types.ts` — the shared domain model (`Product`, `Category`, …).
- `lib/queries.ts` — server-side Supabase reads, including the joined
  `ProductWithRelations` shape used everywhere in the UI.
- `app/actions/` — server actions for all writes (products, taxonomy,
  auth). RLS treats any authenticated Supabase user as an admin, so
  there's a single shared login rather than per-role accounts.
- `components/product-explorer.tsx` — owns search, filters, sort, and
  the list/card view toggle on the homepage; everything below it is
  presentational.
- `app/admin/` — the admin panel: products table (`/admin`), add/edit
  product form, management pages for categories & subcategories (nested
  together, since a subcategory always belongs to a category) and
  brands, and `/admin/settings` (sign-out + Storage Maintenance).
- `lib/image-optimize.ts` / `lib/product-images.ts` /
  `components/admin/image-uploader.tsx` — the product image pipeline:
  validate → resize to ~800px + WebP in the browser → upload to Supabase
  Storage (short random filename under `products/`) → store the public
  URL. Every failure mode (missing bucket, no permission, oversized
  file, unsupported format, network error) surfaces its own friendly
  message rather than a raw error string. `lib/product-images-server.ts`
  is the server-side counterpart used for deleting old/orphaned images
  (see `app/actions/products.ts` and `app/actions/storage.ts`).

## Data model notes

- Categories and subcategories are plain database tables, not an enum —
  add "Makeup", "Perfume", or anything else from the admin panel without
  a schema change. They're still used for organizing and filtering
  products, but are intentionally not shown on product cards or the list
  view — see "Phase 2B notes" below.
- Brands follow a "create on first use" pattern: entering a new brand
  name on a product creates the row automatically, and the admin page
  just cleans up / renames what already exists. Filters only ever list
  brands actually in use on a product (`usedBrands` in `lib/queries.ts`),
  computed from the loaded product set rather than the raw table.
- `capacity` is a plain nullable number with no unit column — this is a
  personal-use app, so the unit is whatever you already know it to be.
  Empty/zero is treated as "not set" and never displayed
  (`formatCapacity` in `lib/utils.ts`).
- `expiration_type` is `'dated' | 'none' | 'unknown'`. Sorting by
  expiration always puts dated products first (nearest date first);
  `'none'` and `'unknown'` sort after, alphabetically by product name.

## Phase 2 notes

- **UI language**: every visible UI string is Traditional Chinese except
  the two brand names, "Beauty Inventory" and "Personal Skincare
  Inventory". There's no i18n framework — strings are written directly
  in each component, matching the original scope of "polish, not a
  redesign."
- **Product images**: there's no manual URL field. Uploading (click or
  drag-and-drop) runs through `lib/image-optimize.ts`, which resizes the
  longest side to ~800px and re-encodes to WebP entirely in the browser
  via `<canvas>`, then `lib/product-images.ts` uploads the result to the
  `product-images` Supabase Storage bucket and stores the public URL.
  Replacing or deleting an image best-effort cleans up the previous
  Storage object. Every surface that shows a product image uses the same
  fixed 88×88 container with `object-fit: contain` (see
  `productImageSize` in `lib/theme.ts`), so bottles are never cropped.
  See "Phase X notes" below for the storage setup itself, which was
  rebuilt after the original inline setup left some projects with a
  missing bucket.
- **List view** (`components/product-list-table.tsx`) is a compact table
  on tablet/desktop (Product, Brand, Category, Expiration, Quantity,
  Favorite, Opened) and switches to stacked rows below the `sm` breakpoint
  so nothing forces horizontal scrolling on a phone.
- **Mobile layout**: the search bar always gets its own row, with
  filters/sort/view-toggle wrapping onto the next line as needed; the
  filter panel becomes a centered, viewport-capped drawer (max 340px)
  instead of a dropdown that could overflow; and `overflow-x: hidden` is
  set at the `html`/`body` level as a last-resort guard. The only
  intentional horizontal-scroll region left is the admin product table,
  which is a bounded, self-contained scroll box (`.scroll-x-region`), not
  a page-level overflow.

## Phase X notes — image upload rebuild

The original inline Storage setup (bundled into `schema.sql`) left some
projects without an actual `product-images` bucket, causing every
upload to fail with "Bucket not found." The whole image system was
rebuilt rather than patched:

- **Storage setup is now its own script**, `supabase/storage-setup.sql`
  — see the "Supabase Storage setup" section above. It's idempotent and
  self-verifying (it selects the bucket back out immediately after
  creating it), and the README spells out the Dashboard fallback for
  Supabase setups that don't allow the SQL editor to write to
  `storage.buckets` directly.
- **`lib/image-optimize.ts`** now validates before touching the canvas:
  rejects non-image files, explicitly calls out unsupported HEIC/HEIF,
  rejects anything over 20MB or empty files, and catches canvas decode
  failures — each with its own message instead of a generic failure.
- **`lib/product-images.ts`** translates raw Supabase Storage errors
  into specific messages: bucket missing, no permission (not signed
  in), file too large, unsupported MIME type, or a network problem —
  falling back to the raw message only for genuinely unexpected errors.
- **`components/admin/image-uploader.tsx`** was rewritten with an
  optimistic local preview (via `URL.createObjectURL`, cleaned up on
  unmount/replace) so the picked image shows immediately while
  processing/uploading runs in the background, a two-phase busy label
  ("處理圖片中…" / "上傳中…"), and a debounced drag counter so drag-over
  state doesn't flicker when the pointer crosses a child element. It
  never throws past its own boundary — every failure path lands on the
  inline error message, not a crashed form.
- The database still only ever stores the final public URL — the
  uploader only calls `onChange` after a successful upload, never with a
  local/blob URL.

## Phase 2B notes — simplification

- **Tags removed.** The Tags field, badges, filter, and admin page are
  gone from the app. The `tags` / `product_tags` tables are still
  defined in `schema.sql` (not dropped) in case any data in them
  mattered — the app just never reads or writes them anymore.
- **Favorite removed.** The `is_favorite` column, the heart icon/button,
  favorite filtering, and favorite sorting are all gone. In the same
  visual spot the heart used to occupy, product cards and the list view
  now show a plain, non-interactive Package / PackageOpen icon
  reflecting the existing `opened` boolean — no label, tooltip, or
  badge text, since this is a personal-use app where the icon alone is
  enough.
- **Category/Subcategory kept, but hidden from the frontend.** They're
  still real tables, still editable in the admin panel, and still power
  search/filtering — they're just no longer printed on product cards or
  in the list view, since they're organizational data rather than
  something you need to re-read every time you glance at a product.
- **Capacity added.** A single optional numeric field, no unit — see
  "Data model notes" above. The admin Categories page now shows a live
  "N 件商品 · total capacity" summary under each subcategory, recomputed
  from the current product set every time you load that page.
- **Notes now shown on the frontend** (card and list view) whenever a
  product has any — hidden entirely otherwise, no empty placeholder.
- Also fixed while touching this code: `formatExpiration` and
  `formatCategoryPath` in `lib/utils.ts` still had English fallback
  strings ("No expiration", "Unknown", "Uncategorized") left over from
  the Phase 2 localization pass — those are now Traditional Chinese too.

## Phase 3E notes — global design system

- **Root-caused the "shape changes on click" bug.** The global
  `:focus-visible` rule in `globals.css` was force-applying
  `border-radius: 4px` to *every* focused element, regardless of that
  element's actual radius (a `rounded-button` pill vs a `rounded-input`
  box vs a `rounded-card` panel). That mismatch was what made controls
  look like they changed shape on focus/click. The fix removes that
  override entirely — the focus outline now follows each element's own
  radius — and the ring itself is now a semi-transparent
  `--color-focus-ring` rather than a solid accent color, so it reads as
  "extremely subtle" everywhere (buttons, inputs, search, dropdowns,
  toolbar, admin forms) from one shared rule, with no per-component
  overrides left anywhere in the codebase.
- **Radius/shadow/duration are now CSS variables**, the same pattern
  colors already used: `--radius-{button,input,card,dropdown,dialog,
  badge}`, `--shadow-{card,card-hover,dropdown,dialog}`,
  `--duration-{fast,base,slow}`, `--ease-standard`, wired into
  `tailwind.config.ts` as `rounded-*` / `shadow-*` / `duration-*` /
  `ease-standard` classes. Every value is unchanged from before this
  phase (e.g. `rounded-button` is still exactly `9999px`, the old
  `rounded-full`) — this phase is architecture, not a visual redesign.
- **Sort button**: icon-only trigger (no text, no visible selected
  value); opens the same custom dropdown as everywhere else; the
  selected option is only ever indicated inside the dropdown, via a
  checkmark.
- **Custom `Dropdown`/`DropdownField`** (`components/ui/dropdown.tsx`)
  replaced the native `<select>` in the Sort control and all four
  filters in the filter dialog (category, subcategory, brand, opened
  status) — consistent colors, radius, hover state, selected-item
  checkmark, and popup animation across both. Native `<select>` is
  still used in the product form and admin taxonomy pages (categories/
  subcategories are edited there, not browsed) — out of scope for this
  pass since it's not part of the toolbar; happy to extend `Dropdown` to
  those too on request.
- **New shared primitives**: `Card`/`HoverCard` (adopted by product
  cards, the list-view table, and the admin product table), `Dialog`
  (the filter modal's chrome, with the same popup animation as
  `Dropdown`), and `ToolbarButton` (Filter and Sort's shared trigger
  shape — same height/padding/radius/hover, so they can never drift
  apart visually again).
- Fixed a real (if small) dark-mode bug found while touching this code:
  the product-card image placeholder was reading `theme.light.border` /
  `theme.light.accentSoft` directly via inline styles, so it never
  actually responded to dark mode. Swapped to the `border-border
  bg-accentSoft` Tailwind classes, which already resolve through the
  CSS variables correctly in both themes.
- Also fixed a stale copy bug in the login form ("…品牌與標籤" still
  mentioned Tags, which Phase 2B removed).

## Phase 4B notes — polish, storage correctness, dark mode removal

**Dark Mode removed entirely.** `next-themes`, the `ThemeProvider`
wrapper, `ThemeToggle`, and every dark-mode CSS variable pair are gone;
`globals.css` now defines light-mode values only. If you ever want it
back, the cleanest path is re-introducing the `.dark { --color-*: … }`
variable block this replaced (still visible in git history) rather than
re-deriving it from scratch.

**Focus and hover effects removed.** `:focus-visible { outline: none; }`
is the one rule governing every interactive element app-wide — buttons,
inputs, search, dropdowns, filter controls all look identical
before/after interaction. Product cards lost their hover shadow too
(`HoverCard` was deleted from `components/ui/card.tsx` as dead code
once nothing used it anymore).

**Image replace/delete correctness.** Previously the uploader deleted
the *old* Storage object client-side, optimistically, the moment a new
upload succeeded — before the product form was even saved. That could
orphan the database's reference if the edit was abandoned. Now:
`components/admin/image-uploader.tsx` only uploads and reports the new
URL; `app/actions/products.ts`'s `updateProduct` fetches the row's
*current* `image_url` before writing, and only deletes that old Storage
object *after* the database write succeeds (`lib/product-images-server.ts`
holds the shared deletion helper, used by `updateProduct`, `deleteProduct`,
and the Storage Maintenance tool). This is deliberately not the literal
"delete old → upload new → save" order — deleting first risks leaving a
product with no image at all if the next step fails. Any orphan this
approach *can* still leave behind (e.g. uploading a replacement image
and then abandoning the edit without saving) is exactly what Storage
Maintenance is for.

**Storage Maintenance** (`/admin/settings`): scans every file in the
`product-images` bucket, compares against every `image_url` actually
referenced by a product, and lets you delete whatever's orphaned — one
at a time or all at once. Server actions in `app/actions/storage.ts`.

**Short filenames.** New uploads go to `products/<10-char-random>.webp`
(e.g. `products/a8f3d91cQm.webp`) instead of a full UUID at the bucket
root. Old-style root-level files from before this change still work
fine and are still picked up by Storage Maintenance's scan (it checks
both locations).

**Corrected total-volume-adjacent spacing/typography**: card info block
now aligns to the top of the image (was vertically centered) so
multi-line Notes doesn't push Brand/Volume out of alignment; title
bumped one size up for clearer hierarchy; card/grid/toolbar spacing
increased throughout for more breathing room; the homepage stats row
(共 X 件商品 / 總庫存 / 總容量) dropped the "・" bullet separators for
plain generous spacing between three independent-feeling stats.

**List view**: percentage-based column widths via `table-fixed` +
`<colgroup>` (商品 25% · 品牌 20% · 容量 5% · 效期 15% · 備註 25% ·
庫存 5% · 開封 5%), fixed row height, every cell vertically centered.
The admin product table got the same `table-fixed` treatment (with its
own 8-column width split) specifically to eliminate a horizontal
scrollbar that could appear on medium-desktop widths — no more bounded
scroll region, it now fits.

**Mobile admin navigation**: the vertical sidebar (Products/Categories/
Brands/sign-out, stacked) is now a horizontal tab row on mobile only —
desktop is unchanged, plus a new 設定 (Settings) entry on both. Sign-out
moved to the Settings page, since the mobile tab row no longer has room
for it (the header's logo already links home, so "返回首頁" wasn't
needed in the tab row either).

**Border radius consolidated to ~10px** across every "box" family
(card/input/dropdown/dialog — was a mix of 10/12/14px); buttons and
badges remain their own fully-rounded pill family. Every one-off
`rounded-lg` / `rounded-xl` / `rounded-md` found during this pass was
switched to the shared `rounded-input` token.


