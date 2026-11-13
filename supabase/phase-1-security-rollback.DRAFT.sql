-- EMERGENCY DRAFT — restores the exact pre-switch security model captured by
-- the Phase 1B production metadata snapshot.
--
-- The restored model permits anonymous reads of inventory data and images and
-- returns broad table privileges to anon/authenticated. Prefer correcting the
-- protected deployment while access remains private. Use this only for a
-- controlled recovery after reviewing current production metadata.
--
-- This draft intentionally ends with ROLLBACK. For an authorized rollback,
-- change only the final ROLLBACK to COMMIT and execute the whole file once.

begin;

select pg_advisory_xact_lock(hashtext('beauty-inventory-phase-1-security'));

-- Refuse to run against an unknown or partially applied state.
do $$
begin
  if to_regnamespace('inventory_private') is null
     or to_regclass('inventory_private.allowed_users') is null
     or to_regprocedure('public.is_inventory_user()') is null then
    raise exception 'Phase 1 rollback preflight failed: allowlist objects are incomplete';
  end if;

  if (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename in ('categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags')) <> 6
     or (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename in ('categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags')
        and policyname = 'inventory owner access'
        and roles = array['authenticated']::name[]) <> 6 then
    raise exception 'Phase 1 rollback preflight failed: protected inventory policies do not match';
  end if;

  if (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects') <> 4
     or (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname in (
          'inventory owner read product images',
          'inventory owner upload product images',
          'inventory owner update product images',
          'inventory owner delete product images'
        )
        and roles = array['authenticated']::name[]) <> 4 then
    raise exception 'Phase 1 rollback preflight failed: protected Storage policies do not match';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-images' and public = false
  ) then
    raise exception 'Phase 1 rollback preflight failed: product-images is not private';
  end if;
end
$$;

do $$
declare
  inventory_table text;
  existing_policy text;
begin
  foreach inventory_table in array array[
    'categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags'
  ]
  loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = inventory_table
    loop
      execute format('drop policy %I on public.%I', existing_policy, inventory_table);
    end loop;

    -- No TO clause: the production baseline policy role is PUBLIC, with the
    -- authenticated role check inside USING/WITH CHECK.
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

-- Restore the direct grants recorded in production metadata. postgres and
-- service_role grants were never changed by Forward and remain untouched.
grant select, insert, update, delete, truncate, references, trigger on table
  public.categories,
  public.subcategories,
  public.brands,
  public.tags,
  public.products,
  public.product_tags
to anon, authenticated;

update storage.buckets
set public = true
where id = 'product-images';

drop policy "inventory owner read product images" on storage.objects;
drop policy "inventory owner upload product images" on storage.objects;
drop policy "inventory owner update product images" on storage.objects;
drop policy "inventory owner delete product images" on storage.objects;

-- No TO clause: these match the four production baseline policies exactly.
create policy "public read product images" on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "admin upload product images" on storage.objects
  for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "admin update product images" on storage.objects
  for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "admin delete product images" on storage.objects
  for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop function public.is_inventory_user();
drop table inventory_private.allowed_users;
drop schema inventory_private;

-- Transaction-local postconditions against the saved production baseline.
do $$
begin
  if (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename in ('categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags')) <> 12
     or (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename in ('categories', 'subcategories', 'brands', 'tags', 'products', 'product_tags')
        and roles = array['public']::name[]) <> 12 then
    raise exception 'Phase 1 rollback postcondition failed: public inventory policies are incomplete';
  end if;

  if (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects') <> 4
     or (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname in (
          'public read product images',
          'admin upload product images',
          'admin update product images',
          'admin delete product images'
        )
        and roles = array['public']::name[]) <> 4 then
    raise exception 'Phase 1 rollback postcondition failed: baseline Storage policies are incomplete';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-images' and public = true
  ) then
    raise exception 'Phase 1 rollback postcondition failed: product-images is not public';
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
    raise exception 'Phase 1 rollback postcondition failed: baseline table grants are incomplete';
  end if;

  if to_regnamespace('inventory_private') is not null
     or to_regprocedure('public.is_inventory_user()') is not null then
    raise exception 'Phase 1 rollback postcondition failed: allowlist objects remain';
  end if;
end
$$;

-- SAFE DEFAULT. For an explicitly authorized emergency rollback, change only
-- this final statement to COMMIT before executing the whole file.
rollback;
