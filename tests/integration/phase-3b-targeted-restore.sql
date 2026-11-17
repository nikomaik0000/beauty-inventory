\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select count(*) as targeted_product_count from public.products \gset

-- A one-product restore must not rebuild an unchanged product. The trigger
-- would fail if the old delete-all implementation tried to reinsert 商品 B.
update public.products
set notes = 'targeted restore baseline'
where id = '40000000-0000-4000-8000-000000000001';
select inventory_private.create_product_backup('update',1) as targeted_backup \gset
update public.products
set notes = 'targeted restore changed'
where id = '40000000-0000-4000-8000-000000000001';

create function test_support.reject_unchanged_restore_insert()
returns trigger language plpgsql as $$
begin
  if new.id = '40000000-0000-4000-8000-000000000002' then
    raise exception 'unchanged product was unnecessarily rebuilt';
  end if;
  return new;
end;
$$;
create trigger test_reject_unchanged_restore_insert
before insert on public.products
for each row execute function test_support.reject_unchanged_restore_insert();

set role authenticated;
select (public.prepare_inventory_backup_restore(:'targeted_backup')
  ->'execution'->>'previewToken') as targeted_token \gset
select public.commit_inventory_backup_restore(
  :'targeted_token','70000000-0000-4000-8000-000000000001','RESTORE'
);
reset role;

drop trigger test_reject_unchanged_restore_insert on public.products;
drop function test_support.reject_unchanged_restore_insert();
select test_support.assert_true(
  (select notes = 'targeted restore baseline'
   from public.products
   where id = '40000000-0000-4000-8000-000000000001'),
  'changed product restored'
);
select test_support.assert_true(
  (select count(*) from public.products) = :'targeted_product_count',
  'targeted restore preserved product count'
);
select test_support.assert_true(
  (select payload from other_site.records where id=1) = 'must remain unchanged',
  'targeted restore preserved other-site data'
);
set role authenticated;
select test_support.assert_true(
  exists(select 1 from public.inventory_referenced_image_paths()
         where path = 'products/b.webp'),
  'targeted restore preserved snapshot image references'
);
reset role;
select 'PASS targeted_restore_does_not_rebuild_unchanged_products';

-- A failure while rebuilding the second changed product must roll back the
-- first rebuild, tag reconciliation, and the restore-before snapshot.
select inventory_private.create_product_backup('update',2) as failure_backup \gset
update public.products set notes = 'failed restore current A'
where id = '40000000-0000-4000-8000-000000000001';
update public.products set notes = 'failed restore current B'
where id = '40000000-0000-4000-8000-000000000002';
select inventory_private.current_product_state_hash() as state_before_failure \gset
select count(*) as backups_before_failure
from inventory_private.inventory_backups \gset

create function test_support.fail_targeted_restore_insert()
returns trigger language plpgsql as $$
begin
  if new.id = '40000000-0000-4000-8000-000000000002' then
    raise exception 'forced targeted restore insert failure';
  end if;
  return new;
end;
$$;
create trigger test_fail_targeted_restore_insert
before insert on public.products
for each row execute function test_support.fail_targeted_restore_insert();

set role authenticated;
select (public.prepare_inventory_backup_restore(:'failure_backup')
  ->'execution'->>'previewToken') as failure_token \gset
select test_support.expect_error(
  format(
    'select public.commit_inventory_backup_restore(%L,%L,''RESTORE'')',
    :'failure_token','70000000-0000-4000-8000-000000000002'
  ),
  'forced targeted restore insert failure'
);
reset role;

drop trigger test_fail_targeted_restore_insert on public.products;
drop function test_support.fail_targeted_restore_insert();
select test_support.assert_true(
  inventory_private.current_product_state_hash() = :'state_before_failure',
  'failed targeted restore left products and tags unchanged'
);
select test_support.assert_true(
  (select count(*) from inventory_private.inventory_backups) =
    :'backups_before_failure',
  'failed targeted restore rolled back its pre-restore snapshot'
);
select test_support.assert_true(
  (select payload from other_site.records where id=1) = 'must remain unchanged',
  'failed targeted restore preserved other-site data'
);
select 'PASS targeted_restore_failure_is_atomic';

