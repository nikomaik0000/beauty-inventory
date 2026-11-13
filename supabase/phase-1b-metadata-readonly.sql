-- Beauty Inventory Phase 1B — production metadata snapshot (READ ONLY)
--
-- This file is exactly one WITH ... SELECT statement. It does not create
-- temporary objects, mutate rows, change privileges, or alter settings.
-- Run it manually in Supabase Dashboard > SQL Editor, then download the
-- single result as CSV and keep it beside the Phase 1B local backup.

with
target_tables(table_name) as (
  values
    ('categories'),
    ('subcategories'),
    ('brands'),
    ('tags'),
    ('products'),
    ('product_tags')
),
target_relations as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
         c.relrowsecurity as rls_enabled,
         c.relforcerowsecurity as rls_forced,
         pg_get_userbyid(c.relowner) as owner_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join target_tables target on target.table_name = c.relname
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
),
inventory_policy_catalog as (
  select pol.oid, pol.polrelid
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where
    (n.nspname = 'public' and c.relname in (select table_name from target_tables))
    or (n.nspname = 'storage' and c.relname = 'objects')
),
inventory_policies as (
  select schemaname as schema_name, tablename as table_name, policyname as policy_name,
         permissive, roles, cmd, qual, with_check
  from pg_policies
  where
    (schemaname = 'public' and tablename in (select table_name from target_tables))
    or (schemaname = 'storage' and tablename = 'objects')
),
storage_objects_security as (
  select n.nspname as schema_name, c.relname as table_name,
         c.relrowsecurity as rls_enabled,
         c.relforcerowsecurity as rls_forced,
         pg_get_userbyid(c.relowner) as owner_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and c.relkind in ('r', 'p')
),
inventory_columns as (
  select table_schema as schema_name, table_name, ordinal_position, column_name,
         data_type, udt_schema, udt_name, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name in (select table_name from target_tables)
),
inventory_constraints as (
  select n.nspname as schema_name, c.relname as table_name,
         con.conname as constraint_name, con.contype as constraint_type,
         pg_get_constraintdef(con.oid, true) as definition
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (select table_name from target_tables)
),
inventory_indexes as (
  select schemaname as schema_name, tablename as table_name,
         indexname as index_name, indexdef as definition
  from pg_indexes
  where schemaname = 'public'
    and tablename in (select table_name from target_tables)
),
inventory_triggers as (
  select t.oid, t.tgfoid as function_oid, n.nspname as schema_name,
         c.relname as table_name, t.tgname as trigger_name,
         pg_get_triggerdef(t.oid, true) as definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal
    and n.nspname = 'public'
    and c.relname in (select table_name from target_tables)
),
related_function_oids as (
  select function_oid as oid from inventory_triggers
  union
  select d.refobjid as oid
  from pg_depend d
  join inventory_policy_catalog policy on policy.oid = d.objid
  where d.classid = 'pg_policy'::regclass
    and d.refclassid = 'pg_proc'::regclass
),
inventory_functions as (
  select p.oid, n.nspname as schema_name, p.proname as function_name,
         pg_get_function_identity_arguments(p.oid) as arguments,
         pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.oid in (select oid from related_function_oids)
),
inventory_table_grants as (
  select grantor, grantee, table_schema as schema_name, table_name,
         privilege_type, is_grantable
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (select table_name from target_tables)
),
inventory_function_grants as (
  select grants.grantor, grants.grantee, grants.routine_schema as schema_name,
         grants.routine_name as function_name, grants.privilege_type,
         grants.is_grantable
  from information_schema.role_routine_grants grants
  where exists (
    select 1
    from inventory_functions functions
    where functions.schema_name = grants.routine_schema
      and functions.function_name = grants.routine_name
  )
),
inventory_enums as (
  select namespace.nspname as schema_name, types.typname as type_name,
         enum.enumsortorder as sort_order, enum.enumlabel as value
  from pg_enum enum
  join pg_type types on types.oid = enum.enumtypid
  join pg_namespace namespace on namespace.oid = types.typnamespace
  where types.oid in (
    select distinct attribute.atttypid
    from pg_attribute attribute
    join target_relations relation on relation.oid = attribute.attrelid
    where attribute.attnum > 0 and not attribute.attisdropped
  )
),
product_image_bucket as (
  select id, name, public, file_size_limit, allowed_mime_types,
         created_at, updated_at
  from storage.buckets
  where id = 'product-images'
)
select jsonb_build_object(
  'format', 'beauty-inventory-phase-1b-metadata',
  'version', 1,
  'generated_at', now(),
  'postgres_version', current_setting('server_version'),
  'tables', coalesce((
    select jsonb_agg(to_jsonb(row) order by row.table_name)
    from target_relations row
  ), '[]'::jsonb),
  'policies', coalesce((
    select jsonb_agg(to_jsonb(row) order by row.schema_name, row.table_name, row.policy_name)
    from inventory_policies row
  ), '[]'::jsonb),
  'storage_objects_security', coalesce((
    select to_jsonb(row) from storage_objects_security row
  ), 'null'::jsonb),
  'columns', coalesce((
    select jsonb_agg(to_jsonb(row) order by row.table_name, row.ordinal_position)
    from inventory_columns row
  ), '[]'::jsonb),
  'constraints', coalesce((
    select jsonb_agg(to_jsonb(row) order by row.table_name, row.constraint_name)
    from inventory_constraints row
  ), '[]'::jsonb),
  'indexes', coalesce((
    select jsonb_agg(to_jsonb(row) order by row.table_name, row.index_name)
    from inventory_indexes row
  ), '[]'::jsonb),
  'triggers', coalesce((
    select jsonb_agg(to_jsonb(row) - 'oid' - 'function_oid' order by row.table_name, row.trigger_name)
    from inventory_triggers row
  ), '[]'::jsonb),
  'functions', coalesce((
    select jsonb_agg(to_jsonb(row) - 'oid' order by row.schema_name, row.function_name, row.arguments)
    from inventory_functions row
  ), '[]'::jsonb),
  'table_grants', coalesce((
    select jsonb_agg(to_jsonb(row) order by row.table_name, row.grantee, row.privilege_type)
    from inventory_table_grants row
  ), '[]'::jsonb),
  'function_grants', coalesce((
    select jsonb_agg(to_jsonb(row) order by row.function_name, row.grantee, row.privilege_type)
    from inventory_function_grants row
  ), '[]'::jsonb),
  'enums', coalesce((
    select jsonb_agg(to_jsonb(row) order by row.schema_name, row.type_name, row.sort_order)
    from inventory_enums row
  ), '[]'::jsonb),
  'product_image_bucket', coalesce((
    select to_jsonb(row) from product_image_bucket row
  ), 'null'::jsonb),
  'counts', jsonb_build_object(
    'categories', (select count(*) from public.categories),
    'subcategories', (select count(*) from public.subcategories),
    'brands', (select count(*) from public.brands),
    'tags', (select count(*) from public.tags),
    'products', (select count(*) from public.products),
    'product_tags', (select count(*) from public.product_tags),
    'opened_products', (
      select count(*) from public.products product
      where coalesce((to_jsonb(product) ->> 'opened')::boolean, false)
    ),
    'products_with_opened_date', (
      select count(*) from public.products product
      where to_jsonb(product) ->> 'opened_date' is not null
    ),
    'products_with_pao_months', (
      select count(*) from public.products product
      where to_jsonb(product) ->> 'pao_months' is not null
    ),
    'product_images', (select count(*) from storage.objects where bucket_id = 'product-images')
  )
) as phase_1b_metadata;
