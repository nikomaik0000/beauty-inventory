-- BEAUTY INVENTORY PHASE 3B TARGETED RESTORE — READ-ONLY POST-INSTALL CHECK
-- Compare the returned counts and fingerprints with the saved preflight row.

with checks(check_name, passed) as (
  values
    (
      'targeted_restore_rpc_v2_installed',
      exists (
        select 1 from pg_proc function_object
        where function_object.oid =
            to_regprocedure('public.commit_inventory_backup_restore(uuid,uuid,text)')
          and function_object.prosecdef
          and obj_description(function_object.oid, 'pg_proc') =
            'beauty-inventory:phase-3b:commit_inventory_backup_restore:v2'
          and md5(function_object.prosrc) =
            'd59ac341a62ad3fe7be363a278355bc5'
          and position('delete from public.products;'
                       in lower(function_object.prosrc)) = 0
          and position('delete from public.products product_row'
                       in lower(function_object.prosrc)) > 0
          and position('delete from public.product_tags product_tag'
                       in lower(function_object.prosrc)) > 0
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
      'phase_1_and_2_objects_preserved',
      to_regprocedure('public.is_inventory_user()') is not null
      and to_regprocedure('public.adjust_product_quantity(uuid,integer)') is not null
      and exists (
        select 1 from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_quantity_nonnegative'
          and convalidated
      )
    ),
    (
      'phase_3b_snapshot_tables_preserved',
      (select count(*) = 5
       from pg_class relation_object
       join pg_namespace schema_object
         on schema_object.oid = relation_object.relnamespace
       where schema_object.nspname = 'inventory_private'
         and relation_object.relname in (
           'inventory_backups','inventory_backup_products',
           'inventory_backup_product_tags','inventory_json_previews',
           'inventory_import_batches'
         )
         and relation_object.relrowsecurity)
    ),
    (
      'no_unexpected_product_incoming_foreign_keys',
      not exists (
        select 1 from pg_constraint constraint_object
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
      (select count(*) = 28 from storage.objects where bucket_id = 'product-images')
    ),
    ('no_negative_quantity', not exists (
      select 1 from public.products where quantity < 0
    ))
)
select check_name, case when passed then 'PASS' else 'FAIL' end as result
from checks
order by check_name;

select
  (
    select md5(function_object.prosrc)
    from pg_proc function_object
    where function_object.oid =
      to_regprocedure('public.commit_inventory_backup_restore(uuid,uuid,text)')
  ) as restore_rpc_body_fingerprint,
  (select count(*) from public.products) as product_count,
  (select count(*) from inventory_private.inventory_backups) as backup_count,
  (select count(*) from inventory_private.inventory_json_previews) as preview_count,
  (select count(*) from inventory_private.inventory_import_batches) as batch_count,
  md5(
    coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text
              from public.products p), '[]') ||
    coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id,pt.tag_id)::text
              from public.product_tags pt), '[]')
  ) as inventory_fingerprint,
  coalesce((select md5(string_agg(name,'|' order by name))
            from storage.objects where bucket_id='product-images'), md5(''))
    as image_path_fingerprint;

