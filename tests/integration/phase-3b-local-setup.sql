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
  metadata jsonb,
  unique (bucket_id, name)
);

create type public.expiration_type as enum ('dated', 'none', 'unknown');
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  image_url text,
  expiration_type public.expiration_type not null default 'unknown',
  expiration_date date,
  opened boolean not null default false,
  opened_date date,
  pao_months integer,
  capacity numeric,
  quantity integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expiration_date_required_when_dated check (expiration_type <> 'dated' or expiration_date is not null),
  constraint opened_date_required_when_opened check (opened = false or opened_date is not null)
);
create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
create trigger trg_products_updated_at before update on public.products
for each row execute function public.set_updated_at();

create schema inventory_private;
revoke all on schema inventory_private from public, anon, authenticated;
create table inventory_private.allowed_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on inventory_private.allowed_users from public, anon, authenticated;
create function public.is_inventory_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from inventory_private.allowed_users allowed
    where allowed.user_id = auth.uid()
  );
$$;
revoke all on function public.is_inventory_user() from public, anon;
grant execute on function public.is_inventory_user() to authenticated;

alter table public.products enable row level security;
create policy inventory_products_select on public.products for select to authenticated using (public.is_inventory_user());
create policy inventory_products_insert on public.products for insert to authenticated with check (public.is_inventory_user());
create policy inventory_products_update on public.products for update to authenticated using (public.is_inventory_user()) with check (public.is_inventory_user());
create policy inventory_products_delete on public.products for delete to authenticated using (public.is_inventory_user());
grant select, insert, update, delete on public.products to authenticated;

insert into auth.users(id,email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','outsider@example.test');
insert into inventory_private.allowed_users(user_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

insert into storage.buckets(id,name,public) values ('product-images','product-images',false);
insert into storage.objects(bucket_id,name,metadata) values
  ('product-images','products/a.webp','{"size":100}'),
  ('product-images','products/b.webp','{"size":200}'),
  ('product-images','products/c.webp','{"size":300}');

insert into public.categories(id,name) values ('10000000-0000-4000-8000-000000000001','保養');
insert into public.subcategories(id,category_id,name) values ('11000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','化妝水');
insert into public.brands(id,name) values ('20000000-0000-4000-8000-000000000001','測試品牌');
insert into public.tags(id,name) values ('30000000-0000-4000-8000-000000000001','保留標籤');
insert into public.products(id,name,brand_id,category_id,subcategory_id,image_url,expiration_type,expiration_date,pao_months,capacity,quantity,notes)
values ('40000000-0000-4000-8000-000000000001','商品 A','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','https://local.invalid/storage/v1/object/public/product-images/products/a.webp?token=must-not-persist','dated','2028-12-31',12,100,2,'原始 A');
insert into public.product_tags(product_id,tag_id) values ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');

create schema other_site;
create table other_site.records(id integer primary key, payload text not null);
insert into other_site.records values (1,'must remain unchanged');

create schema test_support;
create function test_support.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_condition is not true then raise exception 'ASSERTION FAILED: %',p_message; end if;
end;
$$;
create function test_support.expect_error(p_sql text, p_pattern text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm !~* p_pattern then raise exception 'unexpected error: % (wanted pattern %)',sqlerrm,p_pattern; end if;
    return;
  end;
  raise exception 'expected error but statement succeeded: %',p_sql;
end;
$$;
grant usage on schema test_support to anon, authenticated;
grant execute on function test_support.assert_true(boolean,text), test_support.expect_error(text,text) to anon, authenticated;

-- Phase 2 integration install: same function/constraint as the DRAFT, but
-- committed only inside this disposable cluster instead of its safe-default rollback.
alter table public.products add constraint products_quantity_nonnegative check (quantity >= 0) not valid;
alter table public.products validate constraint products_quantity_nonnegative;
comment on constraint products_quantity_nonnegative on public.products is
  'beauty-inventory:phase-2:products_quantity_nonnegative:v1';
create function public.adjust_product_quantity(product_id uuid, quantity_delta integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare updated_quantity integer;
begin
  if quantity_delta not in (-1,1) then raise exception 'quantity_delta must be -1 or 1' using errcode='22023'; end if;
  update public.products set quantity=quantity+quantity_delta
  where id=product_id and quantity+quantity_delta>=0 returning quantity into updated_quantity;
  if updated_quantity is null then
    if exists(select 1 from public.products where id=product_id) then raise exception 'quantity cannot be below zero' using errcode='23514'; end if;
    raise exception 'product not found' using errcode='P0002';
  end if;
  return updated_quantity;
end;
$$;
comment on function public.adjust_product_quantity(uuid,integer) is
  'beauty-inventory:phase-2:adjust_product_quantity:v1';
revoke all on function public.adjust_product_quantity(uuid,integer) from public,anon;
grant execute on function public.adjust_product_quantity(uuid,integer) to authenticated;
