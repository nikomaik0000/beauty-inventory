# Beauty Inventory

Personal Skincare Inventory — a standalone app in the same warm, minimal
design family as Birthday Rewards, for tracking your skincare collection:
expiration dates, opened status, PAO windows, brands, and tags.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase ·
React Hook Form + Zod · TanStack Table · Framer Motion · Lucide Icons ·
next-themes (dark mode) · next-pwa (installable app)

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

- `lib/theme.ts` — every color token, light and dark, mirrored into CSS
  variables in `app/globals.css`. No component should hardcode a hex
  value or use an arbitrary Tailwind bracket value; add a token instead.
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
  product form, and management pages for categories & subcategories
  (nested together, since a subcategory always belongs to a category),
  brands, and tags.
- `lib/image-optimize.ts` / `lib/product-images.ts` /
  `components/admin/image-uploader.tsx` — the product image pipeline:
  validate → resize to ~800px + WebP in the browser → upload to Supabase
  Storage → store the public URL. Every failure mode (missing bucket,
  no permission, oversized file, unsupported format, network error)
  surfaces its own friendly message rather than a raw error string.

## Data model notes

- Categories and subcategories are plain database tables, not an enum —
  add "Makeup", "Perfume", or anything else from the admin panel without
  a schema change.
- Brands and tags follow a "create on first use" pattern: entering a new
  brand or tag name on a product creates the row automatically, and both
  admin pages just clean up / rename what already exists. Filters only
  ever list brands/tags actually in use on a product (`usedBrands` /
  `usedTags` in `lib/queries.ts`), computed from the loaded product set
  rather than the raw tables.
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
