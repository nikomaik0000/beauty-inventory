-- Beauty Inventory — Supabase Storage setup for product images
--
-- Run this in the Supabase SQL editor AFTER running supabase/schema.sql.
-- Safe to re-run: every statement is idempotent (ON CONFLICT / DROP ... IF
-- EXISTS), so if something didn't take effect the first time, just run
-- the whole file again.
--
-- This is the #1 place people get stuck: if the bucket wasn't actually
-- created (e.g. this script was written after you last ran the SQL
-- editor, or a statement silently no-opped), every upload fails with
-- "Bucket not found". If you hit that error, come back here, run this
-- file again, then hard-refresh the app.

-- ---------------------------------------------------------------------------
-- 1. Create the bucket
--
-- Public bucket: uploaded images are already resized/compressed to WebP
-- client-side before upload, so there's nothing sensitive in here and a
-- public read is the simplest thing that works reliably. Restricted to
-- image/webp (what the app always uploads) with a 5MB cap as a sanity
-- limit — the app never sends anything close to that.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. Verify it actually exists
--
-- If this SELECT returns zero rows after running the INSERT above, the
-- SQL editor connection does not have permission to write to
-- storage.buckets on your plan/setup — stop here and create the bucket
-- from the Dashboard instead (Storage → New bucket → name
-- "product-images" → toggle "Public bucket" on), then re-run section 3
-- below for the policies.
-- ---------------------------------------------------------------------------

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'product-images';

-- ---------------------------------------------------------------------------
-- 3. Storage object policies
--
-- Same public-read / authenticated-write split as every table in
-- schema.sql. Dropped and recreated on every run so re-running this
-- file is always safe, including after creating the bucket manually
-- from the Dashboard.
-- ---------------------------------------------------------------------------

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "admin write product images" on storage.objects;
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');
