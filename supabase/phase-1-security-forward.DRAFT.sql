-- DRAFT ONLY — DO NOT RUN AS PART OF LOCAL DEVELOPMENT OR CI.
--
-- Verified against the Phase 1B production metadata snapshot captured before
-- the security switch. This draft intentionally ends with ROLLBACK. For an
-- authorized production cutover, review the entire file and change only the
-- final ROLLBACK to COMMIT, then execute the complete file in one SQL Editor run.
--
-- Required before changing the final ROLLBACK:
--   1. Keep the database JSON, product images, metadata CSV, and a database-
--      native backup together; verify an isolated restore.
--   2. Re-run the read-only metadata snapshot immediately before the cutover.
--      Its table/object counts and policy names must still match the baseline.
--   3. Deploy and verify the protected application and image proxy while the
--      product-images bucket is still public.
--   4. Replace the UUID placeholder below with the existing designated Auth
--      user. Never paste the UUID into chat or commit this edited file.
--   5. Disable new sign-ups in the Auth dashboard only after the existing
--      designated user has been verified. This SQL does not change Auth config.

begin;

-- Serialize a cutover/rollback attempt without locking application tables.
select pg_advisory_xact_lock(hashtext('beauty-inventory-phase-1-security'));

-- Fail closed if production security metadata drifted after the saved snapshot.
do $$
declare
  expected_table_count integer;
begin
  select count(*) into expected_table_count
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname in (
      'categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags'
    )
    and relation.relkind in ('r', 'p')
    and relation.relrowsecurity;

  if expected_table_count <> 6 then
    raise exception 'Phase 1 preflight failed: expected six RLS-enabled inventory tables';
  end if;

  if exists (
    with expected(table_name, policy_name) as (
      values
        ('categories', 'public read categories'),
        ('categories', 'admin write categories'),
        ('subcategories', 'public read subcategories'),
        ('subcategories', 'admin write subcategories'),
        ('brands', 'public read brands'),
        ('brands', 'admin write brands'),
        ('tags', 'public read tags'),
        ('tags', 'admin write tags'),
        ('products', 'public read products'),
        ('products', 'admin write products'),
        ('product_tags', 'public read product_tags'),
        ('product_tags', 'admin write product_tags')
    ), actual as (
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and tablename in (
          'categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags'
        )
    )
    (select * from expected except select * from actual)
    union all
    (select * from actual except select * from expected)
  ) then
    raise exception 'Phase 1 preflight failed: inventory policy set differs from the saved metadata';
  end if;

  if exists (
    with expected(grantee, table_name, privilege_type) as (
      select role_name, table_name, privilege_type
      from (values ('anon'), ('authenticated')) roles(role_name)
      cross join (values
        ('categories'), ('subcategories'), ('brands'),
        ('tags'), ('products'), ('product_tags')
      ) tables(table_name)
      cross join (values
        ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
        ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
      ) privileges(privilege_type)
    ), actual as (
      select grantee, table_name, privilege_type
      from information_schema.role_table_grants
      where grantee in ('anon', 'authenticated')
        and table_schema = 'public'
        and table_name in (
          'categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags'
        )
    )
    (select * from expected except select * from actual)
    union all
    (select * from actual except select * from expected)
  ) then
    raise exception 'Phase 1 preflight failed: inventory table grants differ from the saved metadata';
  end if;

  if exists (
    with expected(policy_name) as (
      values
        ('public read product images'),
        ('admin upload product images'),
        ('admin update product images'),
        ('admin delete product images')
    ), actual as (
      select policyname
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname in (
          'public read product images',
          'admin upload product images',
          'admin update product images',
          'admin delete product images',
          'inventory owner read product images',
          'inventory owner upload product images',
          'inventory owner update product images',
          'inventory owner delete product images'
        )
    )
    (select * from expected except select * from actual)
    union all
    (select * from actual except select * from expected)
  ) then
    raise exception 'Phase 1 preflight failed: Storage policy set differs from the saved metadata';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-images' and public = true
  ) then
    raise exception 'Phase 1 preflight failed: product-images is missing or is no longer public';
  end if;

  if to_regnamespace('inventory_private') is not null then
    raise exception 'Phase 1 preflight failed: inventory_private already exists';
  end if;

  if to_regprocedure('public.is_inventory_user()') is not null then
    raise exception 'Phase 1 preflight failed: public.is_inventory_user() already exists';
  end if;
end
$$;

create schema inventory_private;
revoke all on schema inventory_private from public, anon, authenticated;

create table inventory_private.allowed_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table inventory_private.allowed_users enable row level security;
revoke all on inventory_private.allowed_users from public, anon, authenticated;

-- REQUIRED: replace this placeholder locally before an authorized cutover.
-- The foreign key and assertion below make an unchanged/incorrect UUID fail.
insert into inventory_private.allowed_users (user_id)
values ('00000000-0000-4000-8000-000000000000');

do $$
begin
  if (select count(*) from inventory_private.allowed_users) <> 1 then
    raise exception 'Phase 1 preflight failed: allowlist must contain exactly one user';
  end if;

  if not exists (
    select 1
    from inventory_private.allowed_users allowed
    join auth.users auth_user on auth_user.id = allowed.user_id
  ) then
    raise exception 'Phase 1 preflight failed: allowlisted Auth user does not exist';
  end if;
end
$$;

create function public.is_inventory_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from inventory_private.allowed_users allowed
    where allowed.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_inventory_user() from public, anon;
grant execute on function public.is_inventory_user() to authenticated;

-- Production currently grants every table privilege to anon and authenticated.
-- RLS does not protect TRUNCATE, so reduce direct privileges as well as policies.
revoke all privileges on table
  public.categories,
  public.subcategories,
  public.brands,
  public.tags,
  public.products,
  public.product_tags
from anon;

revoke truncate, references, trigger, maintain on table
  public.categories,
  public.subcategories,
  public.brands,
  public.tags,
  public.products,
  public.product_tags
from authenticated;

grant select, insert, update, delete on table
  public.categories,
  public.subcategories,
  public.brands,
  public.tags,
  public.products,
  public.product_tags
to authenticated;

do $$
declare
  inventory_table text;
  existing_policy text;
begin
  foreach inventory_table in array array[
    'categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags'
  ]
  loop
    execute format('alter table public.%I enable row level security', inventory_table);

    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = inventory_table
    loop
      execute format('drop policy %I on public.%I', existing_policy, inventory_table);
    end loop;

    execute format(
      'create policy "inventory owner access" on public.%I for all to authenticated using (public.is_inventory_user()) with check (public.is_inventory_user())',
      inventory_table
    );
  end loop;
end
$$;

-- Keep object bytes, paths, size limit, and MIME restrictions unchanged.
update storage.buckets
set public = false
where id = 'product-images';

drop policy "public read product images" on storage.objects;
drop policy "admin upload product images" on storage.objects;
drop policy "admin update product images" on storage.objects;
drop policy "admin delete product images" on storage.objects;

create policy "inventory owner read product images" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_inventory_user());

create policy "inventory owner upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_inventory_user());

create policy "inventory owner update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_inventory_user())
  with check (bucket_id = 'product-images' and public.is_inventory_user());

create policy "inventory owner delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_inventory_user());

-- Transaction-local postconditions. API and image smoke tests are still
-- required immediately after a committed cutover.
do $$
begin
  if (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename in ('categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags')) <> 6
     or (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename in ('categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags')
        and policyname = 'inventory owner access'
        and roles = array['authenticated']::name[]) <> 6 then
    raise exception 'Phase 1 postcondition failed: inventory policies are incomplete';
  end if;

  if (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname in (
          'inventory owner read product images',
          'inventory owner upload product images',
          'inventory owner update product images',
          'inventory owner delete product images'
        )
        and roles = array['authenticated']::name[]) <> 4 then
    raise exception 'Phase 1 postcondition failed: private Storage policies are incomplete';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'public read product images',
        'admin upload product images',
        'admin update product images',
        'admin delete product images'
      )
  ) then
    raise exception 'Phase 1 postcondition failed: baseline Storage policies remain';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-images' and public = false
  ) then
    raise exception 'Phase 1 postcondition failed: product-images is not private';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name in ('categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags')
  ) then
    raise exception 'Phase 1 postcondition failed: anon still has inventory table privileges';
  end if;

  if exists (
    with expected(table_name, privilege_type) as (
      select table_name, privilege_type
      from (values
        ('categories'), ('subcategories'), ('brands'),
        ('tags'), ('products'), ('product_tags')
      ) tables(table_name)
      cross join (values
        ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')
      ) privileges(privilege_type)
    ), actual as (
      select table_name, privilege_type
      from information_schema.role_table_grants
      where grantee = 'authenticated'
        and table_schema = 'public'
        and table_name in (
          'categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags'
        )
    )
    (select * from expected except select * from actual)
    union all
    (select * from actual except select * from expected)
  ) then
    raise exception 'Phase 1 postcondition failed: authenticated table grants are not CRUD-only';
  end if;
end
$$;

-- SAFE DEFAULT. For a reviewed and explicitly authorized production run,
-- change only this final statement to COMMIT before executing the whole file.
rollback;
