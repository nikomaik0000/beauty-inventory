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
   policies (public read, authenticated write), seeds the starter
   Face / Body / Hair categories from the brief, and creates the public
   `product-images` Storage bucket (with the same public-read /
   authenticated-write policy split) used by the image uploader.
3. Under **Authentication → Users**, add yourself as a user (email +
   password). This is the account you'll sign in with at `/login` to
   reach the admin panel — there's intentionally no public sign-up.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
from your Supabase project's **Settings → API** page.

## 3. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the inventory, and `/login` to sign in
to `/admin`.

Other scripts: `npm run build`, `npm run start`, `npm run lint`,
`npm run typecheck`.

## 4. Add PWA icons

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
- **Product images**: there's no manual URL field anymore. Uploading
  (click or drag-and-drop) runs through `lib/image-optimize.ts`, which
  resizes the longest side to ~800px and re-encodes to WebP entirely in
  the browser via `<canvas>`, then `lib/product-images.ts` uploads the
  result to the `product-images` Supabase Storage bucket and stores the
  public URL. Replacing or deleting an image best-effort cleans up the
  previous Storage object. Every surface that shows a product image uses
  the same fixed 88×88 container with `object-fit: contain` (see
  `productImageSize` in `lib/theme.ts`), so bottles are never cropped.
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
