-- BEAUTY INVENTORY PHASE 3B TARGETED RESTORE — READ-ONLY PREFLIGHT
-- Run before phase-3b-restore-targeted.PRODUCTION.sql. This file does not
-- mutate application data or database metadata.

with checks(check_name, passed) as (
  values
    (
      'phase_3b_v1_restore_rpc_installed',
      exists (
        select 1
        from pg_proc function_object
        join pg_language function_language
          on function_language.oid = function_object.prolang
        where function_object.oid =
            to_regprocedure('public.commit_inventory_backup_restore(uuid,uuid,text)')
          and function_language.lanname = 'plpgsql'
          and function_object.prosecdef
          and obj_description(function_object.oid, 'pg_proc') =
            'beauty-inventory:phase-3b:commit_inventory_backup_restore:v1'
          and position(
            'delete from public.products;'
            in lower(function_object.prosrc)
          ) > 0
      )
    ),
    (
      'restore_rpc_execute_authenticated_only',
      coalesce(has_function_privilege(
        'authenticated',
        to_regprocedure('public.commit_inventory_backup_restore(uuid,uuid,text)'),
        'execute'
      ), false)
      and not coalesce(has_function_privilege(
        'anon',
        to_regprocedure('public.commit_inventory_backup_restore(uuid,uuid,text)'),
        'execute'
      ), true)
    ),
    (
      'phase_1_allowlist_preserved',
      to_regprocedure('public.is_inventory_user()') is not null
      and to_regclass('inventory_private.allowed_users') is not null
    ),
    (
      'phase_2_inventory_constraint_preserved',
      exists (
        select 1 from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_quantity_nonnegative'
          and convalidated
      )
    ),
    (
      'phase_3b_snapshot_tables_preserved',
      to_regclass('inventory_private.inventory_backups') is not null
      and to_regclass('inventory_private.inventory_backup_products') is not null
      and to_regclass('inventory_private.inventory_backup_product_tags') is not null
      and to_regclass('inventory_private.inventory_json_previews') is not null
      and to_regclass('inventory_private.inventory_import_batches') is not null
    ),
    (
      'no_unexpected_product_incoming_foreign_keys',
      not exists (
        select 1
        from pg_constraint constraint_object
        where constraint_object.contype = 'f'
          and constraint_object.confrelid = 'public.products'::regclass
          and not (
            constraint_object.conrelid = 'public.product_tags'::regclass
            and constraint_object.confdeltype = 'c'
          )
      )
    ),
    ('expected_product_count_28', (select count(*) = 28 from public.products)),
    (
      'expected_product_image_count_28',
      (select count(*) = 28
       from storage.objects
       where bucket_id = 'product-images')
    )
)
select check_name, case when passed then 'PASS' else 'FAIL' end as result
from checks
order by check_name;

select
  current_setting('safeupdate.enabled', true) as safeupdate_enabled,
  (select count(*) from public.products) as product_count,
  (select count(*) from inventory_private.inventory_backups) as backup_count,
  (select count(*) from inventory_private.inventory_json_previews) as preview_count,
  (select count(*) from inventory_private.inventory_import_batches) as batch_count,
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

