-- DRAFT ONLY — DO NOT RUN FROM LOCAL DEVELOPMENT OR CI.
--
-- Required by the Phase 2 quick +/- stock controls. Review and test this in an
-- isolated Supabase project before any production execution. The function is
-- SECURITY INVOKER so the caller's table grants and RLS policies still apply.

begin;

alter table public.products
  add constraint products_quantity_nonnegative
  check (quantity >= 0) not valid;

alter table public.products
  validate constraint products_quantity_nonnegative;

create or replace function public.adjust_product_quantity(
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

revoke all on function public.adjust_product_quantity(uuid, integer) from public, anon;
grant execute on function public.adjust_product_quantity(uuid, integer) to authenticated;

-- SAFE DEFAULT. Change only after backup, review, and isolated restore testing.
rollback;
