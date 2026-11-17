\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text not null unique
);
create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.role()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claim.role', true);
$$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;

create table public.categories (id uuid primary key default gen_random_uuid());
create table public.subcategories (id uuid primary key default gen_random_uuid());
create table public.brands (id uuid primary key default gen_random_uuid());
create table public.tags (id uuid primary key default gen_random_uuid());
create table public.products (
  id uuid primary key default gen_random_uuid(),
  quantity integer not null default 1
);
create table public.product_tags (id uuid primary key default gen_random_uuid());

do $$
declare
  inventory_table text;
begin
  foreach inventory_table in array array[
    'categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags'
  ]
  loop
    execute format('alter table public.%I enable row level security', inventory_table);
    execute format(
      'create policy "public read %s" on public.%I for select using (true)',
      inventory_table,
      inventory_table
    );
    execute format(
      'create policy "admin write %s" on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      inventory_table,
      inventory_table
    );
  end loop;
end
$$;

grant select, insert, update, delete, truncate, references, trigger on table
  public.categories,
  public.subcategories,
  public.brands,
  public.tags,
  public.products,
  public.product_tags
to anon, authenticated;

insert into auth.users (id, email)
values ('00000000-0000-4000-8000-000000000000', 'owner@example.test');

insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('shared-site-images', 'shared-site-images', true);

create policy "public read product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "admin upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- Represents a policy owned by another website in the shared Supabase project.
create policy "shared site read images" on storage.objects
  for select using (bucket_id = 'shared-site-images');

create schema other_site;
create table other_site.records (
  id integer primary key,
  payload text not null
);
insert into other_site.records values (1, 'must remain unchanged');

insert into public.products (id, quantity)
values ('40000000-0000-4000-8000-000000000001', 5);

-- Match the production row count with fictional UUIDs while keeping the one
-- deterministic product above for stock assertions.
insert into public.products (id, quantity)
select md5('phase-2-fictional-product-' || sequence_number::text)::uuid,
       sequence_number
from generate_series(2, 28) sequence_number;

create schema test_support;
create function test_support.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'ASSERTION FAILED: %', message;
  end if;
end;
$$;
