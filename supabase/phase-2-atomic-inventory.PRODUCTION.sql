-- BEAUTY INVENTORY PHASE 2 — REVIEWED PRODUCTION FORWARD
-- Run only in the intended Supabase project's SQL Editor after reviewing the
-- complete file. This file is derived from phase-2-atomic-inventory.DRAFT.sql.
-- It affects only:
--   1. public.products.products_quantity_nonnegative
--   2. public.adjust_product_quantity(uuid, integer)
-- It does not update product rows, Phase 1 objects, Storage, or other schemas.

begin;

select pg_advisory_xact_lock(hashtext('beauty-inventory-phase-2-atomic-inventory'));

-- Fail closed unless the installed Phase 1 contract still protects products,
-- and refuse to adopt or replace same-named objects owned by another site.
do $$
begin
  if to_regprocedure('public.is_inventory_user()') is null
     or not exists (
       select 1
       from pg_proc function_object
       where function_object.oid = to_regprocedure('public.is_inventory_user()')
         and function_object.prosecdef
     )
     or not has_function_privilege(
       'authenticated', 'public.is_inventory_user()', 'execute'
     )
     or has_function_privilege('anon', 'public.is_inventory_user()', 'execute') then
    raise exception 'Phase 2 preflight failed: Phase 1 allowlist function is incomplete';
  end if;

  if not exists (
    select 1
    from pg_class relation_object
    join pg_namespace schema_object on schema_object.oid = relation_object.relnamespace
    where schema_object.nspname = 'public'
      and relation_object.relname = 'products'
      and relation_object.relkind in ('r', 'p')
      and relation_object.relrowsecurity
  )
  or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'inventory owner access'
      and cmd = 'ALL'
      and roles = array['authenticated']::name[]
      and qual like '%is_inventory_user%'
      and with_check like '%is_inventory_user%'
  ) then
    raise exception 'Phase 2 preflight failed: Phase 1 products RLS policy is incomplete';
  end if;

  if has_table_privilege('anon', 'public.products', 'select')
     or has_table_privilege('anon', 'public.products', 'insert')
     or has_table_privilege('anon', 'public.products', 'update')
     or has_table_privilege('anon', 'public.products', 'delete')
     or not has_table_privilege('authenticated', 'public.products', 'select')
     or not has_table_privilege('authenticated', 'public.products', 'update') then
    raise exception 'Phase 2 preflight failed: Phase 1 products grants are incomplete';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_quantity_nonnegative'
  ) then
    raise exception 'Phase 2 preflight failed: constraint public.products.products_quantity_nonnegative already exists';
  end if;

  if to_regprocedure('public.adjust_product_quantity(uuid,integer)') is not null then
    raise exception 'Phase 2 preflight failed: function public.adjust_product_quantity(uuid,integer) already exists';
  end if;

  -- Transaction-local audit value. The postcondition below makes any product
  -- id/quantity change during this installation abort the complete transaction.
  perform set_config(
    'beauty_inventory.phase2_quantity_fingerprint',
    coalesce((
      select md5(string_agg(
        product.id::text || ':' || coalesce(product.quantity::text, '<null>'),
        '|' order by product.id
      ))
      from public.products product
    ), md5('')),
    true
  );
end
$$;

alter table public.products
  add constraint products_quantity_nonnegative
  check (quantity >= 0) not valid;

alter table public.products
  validate constraint products_quantity_nonnegative;

comment on constraint products_quantity_nonnegative on public.products is
  'beauty-inventory:phase-2:products_quantity_nonnegative:v1';

create function public.adjust_product_quantity(
  product_id uuid,
  quantity_delta integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_quantity integer;
begin
  if quantity_delta not in (-1, 1) then
    raise exception 'quantity_delta must be -1 or 1' using errcode = '22023';
  end if;

  update public.products
  set quantity = quantity + quantity_delta
  where id = product_id
    and quantity + quantity_delta >= 0
  returning quantity into updated_quantity;

  if updated_quantity is null then
    if exists (select 1 from public.products where id = product_id) then
      raise exception 'quantity cannot be below zero' using errcode = '23514';
    end if;
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  return updated_quantity;
end
$$;

comment on function public.adjust_product_quantity(uuid, integer) is
  'beauty-inventory:phase-2:adjust_product_quantity:v1';

revoke all on function public.adjust_product_quantity(uuid, integer) from public, anon;
grant execute on function public.adjust_product_quantity(uuid, integer) to authenticated;

do $$
declare
  installed_function regprocedure :=
    to_regprocedure('public.adjust_product_quantity(uuid,integer)');
  current_quantity_fingerprint text;
begin
  if not exists (
    select 1
    from pg_constraint constraint_object
    where constraint_object.conrelid = 'public.products'::regclass
      and constraint_object.conname = 'products_quantity_nonnegative'
      and constraint_object.contype = 'c'
      and constraint_object.convalidated
      and obj_description(constraint_object.oid, 'pg_constraint') =
        'beauty-inventory:phase-2:products_quantity_nonnegative:v1'
  ) then
    raise exception 'Phase 2 postcondition failed: owned nonnegative constraint is incomplete';
  end if;

  if installed_function is null
     or not exists (
       select 1
       from pg_proc function_object
       where function_object.oid = installed_function
         and not function_object.prosecdef
         and obj_description(function_object.oid, 'pg_proc') =
           'beauty-inventory:phase-2:adjust_product_quantity:v1'
     )
     or not has_function_privilege('authenticated', installed_function, 'execute')
     or has_function_privilege('anon', installed_function, 'execute') then
    raise exception 'Phase 2 postcondition failed: owned atomic inventory function is incomplete';
  end if;

  select coalesce(md5(string_agg(
    product.id::text || ':' || coalesce(product.quantity::text, '<null>'),
    '|' order by product.id
  )), md5(''))
  into current_quantity_fingerprint
  from public.products product;

  if current_quantity_fingerprint is distinct from
     current_setting('beauty_inventory.phase2_quantity_fingerprint', true) then
    raise exception 'Phase 2 postcondition failed: product inventory changed during installation';
  end if;
end
$$;

commit;
