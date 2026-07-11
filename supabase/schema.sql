-- Beauty Inventory schema
-- Run this in the Supabase SQL editor on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Categories & Subcategories
-- Deliberately NOT hardcoded: fully managed from the admin panel so the
-- app can grow into makeup, perfume, haircare, tools, etc. without a
-- schema change.
-- ---------------------------------------------------------------------------

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

-- ---------------------------------------------------------------------------
-- Brands & Tags
-- Both behave like a free-text "create on the fly" vocabulary: a brand or
-- tag row is only created when a product actually uses it, and filters
-- only ever list values that exist on at least one product.
-- ---------------------------------------------------------------------------

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- NOTE: as of Phase 2B the app no longer uses tags at all (removed as an
-- unnecessary feature for a personal-use inventory). These tables are
-- kept here rather than dropped, in case any data in them matters to
-- you — see supabase/phase-2b-migration.sql for the app-side capacity
-- column change, and drop `tags`/`product_tags` yourself whenever
-- you're comfortable losing that data.
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

create type expiration_type as enum ('dated', 'none', 'unknown');

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand_id uuid references brands(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  image_url text,
  expiration_type expiration_type not null default 'unknown',
  expiration_date date,
  opened boolean not null default false,
  opened_date date,
  pao_months integer,
  capacity numeric, -- plain number, no unit — personal use, the unit is implicit
  quantity integer not null default 1,
  is_favorite boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expiration_date_required_when_dated
    check (expiration_type <> 'dated' or expiration_date is not null),
  constraint opened_date_required_when_opened
    check (opened = false or opened_date is not null)
);

create table if not exists product_tags (
  product_id uuid not null references products(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_subcategory on products(subcategory_id);
create index if not exists idx_products_brand on products(brand_id);
create index if not exists idx_products_expiration_date on products(expiration_date);
create index if not exists idx_products_name on products using gin (to_tsvector('simple', name));
create index if not exists idx_subcategories_category on subcategories(category_id);
create index if not exists idx_product_tags_tag on product_tags(tag_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Read is public (this is a personal inventory site with no sensitive
-- data); writes require an authenticated session, matching the
-- admin-only mutation pattern used in Birthday Rewards.
-- ---------------------------------------------------------------------------

alter table categories enable row level security;
alter table subcategories enable row level security;
alter table brands enable row level security;
alter table tags enable row level security;
alter table products enable row level security;
alter table product_tags enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read subcategories" on subcategories for select using (true);
create policy "public read brands" on brands for select using (true);
create policy "public read tags" on tags for select using (true);
create policy "public read products" on products for select using (true);
create policy "public read product_tags" on product_tags for select using (true);

create policy "admin write categories" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write subcategories" on subcategories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write brands" on brands for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write tags" on tags for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write products" on products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write product_tags" on product_tags for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Seed data: starter categories matching the brief's examples.
-- Safe to delete/edit from the admin panel afterward.
-- ---------------------------------------------------------------------------

insert into categories (name, sort_order) values
  ('Face', 0), ('Body', 1), ('Hair', 2)
on conflict (name) do nothing;

insert into subcategories (category_id, name, sort_order)
select c.id, s.name, s.sort_order
from categories c
join (values
  ('Face', 'Cleanser', 0), ('Face', 'Makeup Remover', 1), ('Face', 'Toner', 2),
  ('Face', 'Serum', 3), ('Face', 'Lotion', 4), ('Face', 'Cream', 5),
  ('Body', 'Body Wash', 0), ('Body', 'Body Lotion', 1), ('Body', 'Scrub', 2),
  ('Hair', 'Shampoo', 0), ('Hair', 'Conditioner', 1), ('Hair', 'Hair Treatment', 2)
) as s(category_name, name, sort_order) on s.category_name = c.name
on conflict (category_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- Storage (product images) is set up separately — see
-- supabase/storage-setup.sql. Run it right after this file.
-- ---------------------------------------------------------------------------
