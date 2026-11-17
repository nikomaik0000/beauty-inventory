-- BEAUTY INVENTORY PHASE 2 — ROLLBACK REVIEW COPY
-- DO NOT EXECUTE AS-IS AS A PRODUCTION CHANGE.
-- This file intentionally ends with ROLLBACK. It removes only objects carrying
-- the exact Phase 2 ownership markers and never rewrites product quantities.
-- An emergency rollback requires a separate authorization and a final manual
-- change from ROLLBACK to COMMIT after current metadata has been reviewed.

begin;

select pg_advisory_xact_lock(hashtext('beauty-inventory-phase-2-atomic-inventory'));

do $$
declare
  constraint_oid oid;
  function_oid oid;
begin
  select constraint_object.oid
  into constraint_oid
  from pg_constraint constraint_object
  where constraint_object.conrelid = 'public.products'::regclass
    and constraint_object.conname = 'products_quantity_nonnegative'
    and constraint_object.contype = 'c'
    and constraint_object.convalidated
    and pg_get_constraintdef(constraint_object.oid) ~ 'quantity >= 0';

  if constraint_oid is null
     or obj_description(constraint_oid, 'pg_constraint') is distinct from
       'beauty-inventory:phase-2:products_quantity_nonnegative:v1' then
    raise exception 'Phase 2 rollback preflight failed: owned nonnegative constraint does not match';
  end if;

  function_oid := to_regprocedure('public.adjust_product_quantity(uuid,integer)');

  if function_oid is null
     or not exists (
       select 1
       from pg_proc function_object
       join pg_language function_language on function_language.oid = function_object.prolang
       where function_object.oid = function_oid
         and function_language.lanname = 'plpgsql'
         and function_object.prorettype = 'integer'::regtype
         and not function_object.prosecdef
         and function_object.prosrc like '%set quantity = quantity + quantity_delta%'
         and function_object.prosrc like '%quantity + quantity_delta >= 0%'
         and obj_description(function_object.oid, 'pg_proc') =
           'beauty-inventory:phase-2:adjust_product_quantity:v1'
     ) then
    raise exception 'Phase 2 rollback preflight failed: owned atomic inventory function does not match';
  end if;
end
$$;

drop function public.adjust_product_quantity(uuid, integer);

alter table public.products
  drop constraint products_quantity_nonnegative;

do $$
begin
  if to_regprocedure('public.adjust_product_quantity(uuid,integer)') is not null
     or exists (
       select 1
       from pg_constraint
       where conrelid = 'public.products'::regclass
         and conname = 'products_quantity_nonnegative'
     ) then
    raise exception 'Phase 2 rollback postcondition failed: Phase 2 objects remain';
  end if;
end
$$;

rollback;
