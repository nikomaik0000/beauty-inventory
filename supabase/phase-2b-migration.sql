-- Beauty Inventory — Phase 2B migration
--
-- Run this in the Supabase SQL editor if your database already existed
-- before this phase (i.e. you're not setting up a fresh project from
-- schema.sql). Safe to re-run — every statement uses IF EXISTS / IF NOT
-- EXISTS.
--
-- What changed this phase:
--   - Added `capacity` (plain number, no unit) to `products`.
--   - Removed the Favorite feature. `is_favorite` is dropped from the
--     table below. If you'd rather keep the column/data around a bit
--     longer just in case, skip that one statement — the app no longer
--     reads or writes it either way, so leaving it in place is harmless.
--   - Tags were removed from the app, but the `tags` / `product_tags`
--     tables themselves are left untouched — see the note in
--     schema.sql if you want to drop them too.

alter table products add column if not exists capacity numeric;

alter table products drop column if exists is_favorite;
