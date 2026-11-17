-- BEAUTY INVENTORY PHASE 3B — READ-ONLY PRODUCTION PREFLIGHT
-- Revision: preinstall-safe-v2. This file never binds a Phase 3B runtime table
-- directly; all collision checks use PostgreSQL catalogs and to_regclass().
-- Run before the production forward SQL. Continue only when every check is
-- PASS, product_count/image_object_count match the expected production state,
-- and the returned fingerprints have been saved for post-install comparison.

with expected_phase3b_functions(signature) as (
  values
    ('inventory_private.assert_inventory_user()'),
    ('inventory_private.image_object_path(text)'),
    ('inventory_private.product_snapshot(public.products)'),
    ('inventory_private.current_product_state_hash()'),
    ('inventory_private.product_matches_json(public.products,jsonb)'),
    ('inventory_private.create_product_backup(text,integer)'),
    ('inventory_private.prune_product_backups()'),
    ('public.prepare_inventory_json_import(jsonb,text,integer[])'),
    ('public.commit_inventory_json_import(uuid,uuid,text)'),
    ('public.list_inventory_backups()'),
    ('public.prepare_inventory_backup_restore(uuid)'),
    ('public.commit_inventory_backup_restore(uuid,uuid,text)'),
    ('public.inventory_referenced_image_paths()')
), expected_phase3b_tables(table_name) as (
  values
    ('inventory_backups'),
    ('inventory_backup_products'),
    ('inventory_backup_product_tags'),
    ('inventory_json_previews'),
    ('inventory_import_batches')
), checks(check_name, passed) as (
  values
    (
      'phase_1_allowlist_ready',
      to_regclass('inventory_private.allowed_users') is not null
      and to_regprocedure('public.is_inventory_user()') is not null
      and coalesce(has_function_privilege(
        'authenticated', to_regprocedure('public.is_inventory_user()'), 'execute'
      ), false)
      and not coalesce(has_function_privilege(
        'anon', to_regprocedure('public.is_inventory_user()'), 'execute'
      ), true)
    ),
    (
      'six_inventory_tables_rls_enabled',
      (select count(*) = 6
       from pg_class relation_object
       join pg_namespace schema_object on schema_object.oid = relation_object.relnamespace
       where schema_object.nspname = 'public'
         and relation_object.relname in (
           'categories','subcategories','brands','tags','products','product_tags'
         )
         and relation_object.relrowsecurity)
    ),
    (
      'phase_1_owner_policies_present',
      (select count(*) = 6
       from pg_policies
       where schemaname = 'public'
         and tablename in (
           'categories','subcategories','brands','tags','products','product_tags'
         )
         and policyname = 'inventory owner access'
         and roles = array['authenticated']::name[])
    ),
    (
      'phase_2_atomic_inventory_ready',
      exists (
        select 1
        from pg_proc function_object
        where function_object.oid =
          to_regprocedure('public.adjust_product_quantity(uuid,integer)')
          and not function_object.prosecdef
          and obj_description(function_object.oid, 'pg_proc') =
            'beauty-inventory:phase-2:adjust_product_quantity:v1'
      )
      and exists (
        select 1
        from pg_constraint constraint_object
        where constraint_object.conrelid = 'public.products'::regclass
          and constraint_object.conname = 'products_quantity_nonnegative'
          and constraint_object.convalidated
          and obj_description(constraint_object.oid, 'pg_constraint') =
            'beauty-inventory:phase-2:products_quantity_nonnegative:v1'
      )
    ),
    (
      'product_images_private',
      exists (
        select 1 from storage.buckets
        where id = 'product-images' and public = false
      )
    ),
    (
      'product_images_owner_policies_present',
      (select count(*) = 4
       from pg_policies
       where schemaname = 'storage'
         and tablename = 'objects'
         and policyname in (
           'inventory owner read product images',
           'inventory owner upload product images',
           'inventory owner update product images',
           'inventory owner delete product images'
         )
         and roles = array['authenticated']::name[])
    ),
    (
      'phase_3b_function_names_available',
      not exists (
        select 1 from expected_phase3b_functions
        where to_regprocedure(signature) is not null
      )
    ),
    (
      'phase_3b_internal_table_names_available',
      not exists (
        select 1 from expected_phase3b_tables
        where to_regclass('inventory_private.' || table_name) is not null
      )
    ),
    ('expected_product_count_28', (select count(*) = 28 from public.products)),
    (
      'expected_product_image_count_28',
      (select count(*) = 28 from storage.objects where bucket_id = 'product-images')
    ),
    ('no_negative_quantity', not exists (select 1 from public.products where quantity < 0))
)
select check_name, case when passed then 'PASS' else 'FAIL' end as result
from checks
order by check_name;

select
  (select count(*) from public.products) as product_count,
  (select count(*) from storage.objects where bucket_id = 'product-images') as image_object_count,
  md5(
    coalesce((
      select jsonb_agg(to_jsonb(product_row) order by product_row.id)::text
      from public.products product_row
    ), '[]') ||
    coalesce((
      select jsonb_agg(to_jsonb(product_tag_row)
        order by product_tag_row.product_id, product_tag_row.tag_id)::text
      from public.product_tags product_tag_row
    ), '[]')
  ) as inventory_fingerprint,
  coalesce((
    select md5(string_agg(storage_object.name, '|' order by storage_object.name))
    from storage.objects storage_object
    where storage_object.bucket_id = 'product-images'
  ), md5('')) as image_path_fingerprint;
