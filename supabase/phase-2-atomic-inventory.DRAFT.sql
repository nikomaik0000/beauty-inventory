-- DRAFT ONLY — DO NOT RUN FROM LOCAL DEVELOPMENT OR CI.
--
-- Required by the Phase 2 quick +/- stock controls. Review and test this in an
-- isolated Supabase project before any production execution. The function is
-- SECURITY INVOKER so the caller's table grants and RLS policies still apply.

begin;

select pg_advisory_xact_lock(hashtext('beauty-inventory-phase-2-atomic-inventory'));

-- Fail closed instead of adopting or replacing an object that may belong to
-- another site sharing this database.
do $$
begin
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

  if not exists (
    select 1
    from pg_proc function_object
    where function_object.oid = to_regprocedure('public.adjust_product_quantity(uuid,integer)')
      and not function_object.prosecdef
      and obj_description(function_object.oid, 'pg_proc') =
        'beauty-inventory:phase-2:adjust_product_quantity:v1'
  ) then
    raise exception 'Phase 2 postcondition failed: owned atomic inventory function is incomplete';
  end if;
end
$$;

-- SAFE DEFAULT. Change only after backup, review, and isolated restore testing.
rollback;
