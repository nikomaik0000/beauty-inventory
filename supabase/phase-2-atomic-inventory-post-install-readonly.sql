-- BEAUTY INVENTORY PHASE 2 — READ-ONLY POST-INSTALL VERIFICATION
-- Run only after phase-2-atomic-inventory.PRODUCTION.sql succeeds.
-- This script performs metadata/data reads only and does not invoke the RPC.

with phase2_function as (
  select function_object.oid, function_object.prosecdef,
         obj_description(function_object.oid, 'pg_proc') as ownership_marker
  from pg_proc function_object
  where function_object.oid =
    to_regprocedure('public.adjust_product_quantity(uuid,integer)')
), checks(check_name, passed) as (
  values
    (
      'phase_1_products_rls_allowlist',
      exists (
        select 1
        from pg_class relation_object
        where relation_object.oid = 'public.products'::regclass
          and relation_object.relrowsecurity
      )
      and exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'products'
          and policyname = 'inventory owner access'
          and roles = array['authenticated']::name[]
          and qual like '%is_inventory_user%'
          and with_check like '%is_inventory_user%'
      )
    ),
    (
      'rpc_security_invoker_and_marker',
      exists (
        select 1 from phase2_function
        where not prosecdef
          and ownership_marker =
            'beauty-inventory:phase-2:adjust_product_quantity:v1'
      )
    ),
    (
      'rpc_authenticated_execute',
      coalesce(has_function_privilege(
        'authenticated',
        to_regprocedure('public.adjust_product_quantity(uuid,integer)'),
        'execute'
      ), false)
    ),
    (
      'rpc_anon_execute_denied',
      not coalesce(has_function_privilege(
        'anon',
        to_regprocedure('public.adjust_product_quantity(uuid,integer)'),
        'execute'
      ), true)
    ),
    (
      'quantity_constraint_validated_and_marked',
      exists (
        select 1
        from pg_constraint constraint_object
        where constraint_object.conrelid = 'public.products'::regclass
          and constraint_object.conname = 'products_quantity_nonnegative'
          and constraint_object.contype = 'c'
          and constraint_object.convalidated
          and pg_get_constraintdef(constraint_object.oid) ~ 'quantity >= 0'
          and obj_description(constraint_object.oid, 'pg_constraint') =
            'beauty-inventory:phase-2:products_quantity_nonnegative:v1'
      )
    ),
    (
      'expected_product_count_28',
      (select count(*) = 28 from public.products)
    ),
    (
      'no_negative_quantity',
      not exists (select 1 from public.products where quantity < 0)
    )
)
select check_name,
       case when passed then 'PASS' else 'FAIL' end as result
from checks
order by check_name;

-- Audit-only fingerprint. The forward transaction already aborts if any
-- product id/quantity value changes during installation. Save this hash with
-- the SQL Editor result if an additional later comparison is desired.
select count(*) as product_count,
       coalesce(md5(string_agg(
         product.id::text || ':' || coalesce(product.quantity::text, '<null>'),
         '|' order by product.id
       )), md5('')) as quantity_fingerprint
from public.products product;
