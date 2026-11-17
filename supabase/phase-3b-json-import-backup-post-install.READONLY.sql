-- BEAUTY INVENTORY PHASE 3B — READ-ONLY POST-INSTALL VERIFICATION
-- Run after the production forward succeeds. Compare the two fingerprints in
-- the final result with the saved preflight result; both must be identical.
-- This script does not call any Phase 3B RPC or modify runtime records.
-- The committed forward transaction itself verifies that all five runtime
-- tables are empty at installation; this read-only script avoids directly
-- binding those tables so an accidental pre-install run returns FAIL, not 42P01.

with expected_tables(table_name) as (
  values
    ('inventory_backups'),
    ('inventory_backup_products'),
    ('inventory_backup_product_tags'),
    ('inventory_json_previews'),
    ('inventory_import_batches')
), expected_public_functions(signature) as (
  values
    ('public.prepare_inventory_json_import(jsonb,text,integer[])'),
    ('public.commit_inventory_json_import(uuid,uuid,text)'),
    ('public.list_inventory_backups()'),
    ('public.prepare_inventory_backup_restore(uuid)'),
    ('public.commit_inventory_backup_restore(uuid,uuid,text)'),
    ('public.inventory_referenced_image_paths()')
), expected_private_functions(signature) as (
  values
    ('inventory_private.assert_inventory_user()'),
    ('inventory_private.image_object_path(text)'),
    ('inventory_private.product_snapshot(public.products)'),
    ('inventory_private.current_product_state_hash()'),
    ('inventory_private.product_matches_json(public.products,jsonb)'),
    ('inventory_private.create_product_backup(text,integer)'),
    ('inventory_private.prune_product_backups()')
), checks(check_name, passed) as (
  values
    (
      'phase_1_allowlist_and_rls_preserved',
      to_regprocedure('public.is_inventory_user()') is not null
      and (select count(*) = 6
           from pg_policies
           where schemaname = 'public'
             and tablename in (
               'categories','subcategories','brands','tags','products','product_tags'
             )
             and policyname = 'inventory owner access'
             and roles = array['authenticated']::name[])
    ),
    (
      'phase_2_rpc_and_constraint_preserved',
      to_regprocedure('public.adjust_product_quantity(uuid,integer)') is not null
      and exists (
        select 1 from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_quantity_nonnegative'
          and convalidated
      )
    ),
    (
      'five_internal_tables_marked_and_rls_enabled',
      not exists (
        select 1 from expected_tables
        where to_regclass('inventory_private.' || table_name) is null
           or not exists (
             select 1 from pg_class relation_object
             where relation_object.oid =
               to_regclass('inventory_private.' || table_name)
               and relation_object.relrowsecurity
               and obj_description(relation_object.oid, 'pg_class') =
                 'beauty-inventory:phase-3b:' || table_name || ':v1'
           )
      )
    ),
    (
      'internal_tables_have_no_api_role_grants',
      not exists (
        select 1
        from information_schema.role_table_grants
        where table_schema = 'inventory_private'
          and table_name in (select table_name from expected_tables)
          and grantee in ('PUBLIC','anon','authenticated')
      )
    ),
    (
      'six_public_rpcs_marked_security_definer',
      not exists (
        select 1 from expected_public_functions
        where to_regprocedure(signature) is null
           or not exists (
             select 1 from pg_proc function_object
             where function_object.oid = to_regprocedure(signature)
               and function_object.prosecdef
               and obj_description(function_object.oid, 'pg_proc') like
                 'beauty-inventory:phase-3b:%:v1'
           )
      )
    ),
    (
      'public_rpc_execute_authenticated_only',
      not exists (
        select 1 from expected_public_functions
        where to_regprocedure(signature) is null
           or not coalesce(has_function_privilege(
             'authenticated', to_regprocedure(signature), 'execute'
           ), false)
           or coalesce(has_function_privilege(
             'anon', to_regprocedure(signature), 'execute'
           ), true)
      )
    ),
    (
      'seven_private_helpers_marked_and_not_executable_by_api_roles',
      not exists (
        select 1 from expected_private_functions
        where to_regprocedure(signature) is null
           or obj_description(to_regprocedure(signature), 'pg_proc') not like
                'beauty-inventory:phase-3b:%:v1'
           or coalesce(has_function_privilege(
             'authenticated', to_regprocedure(signature), 'execute'
           ), true)
           or coalesce(has_function_privilege(
             'anon', to_regprocedure(signature), 'execute'
           ), true)
      )
    ),
    (
      'product_images_still_private_with_owner_policies',
      exists (
        select 1 from storage.buckets
        where id = 'product-images' and public = false
      )
      and (select count(*) = 4
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
