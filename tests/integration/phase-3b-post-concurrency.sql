\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- Results of the shell-level two-session tests.
select test_support.assert_true((select quantity from public.products where id='40000000-0000-4000-8000-000000000001')=34,'two concurrent Phase 2 increments were retained');
select test_support.assert_true((select count(*) from inventory_private.inventory_import_batches where idempotency_key='60000000-0000-4000-8000-000000000003')=1,'concurrent idempotent submit stored one batch');
select test_support.assert_true((select count(*) from inventory_private.inventory_backups)=10,'retention still holds after concurrent imports');
select 'PASS concurrent_phase2_and_phase3b_results';

-- Storage and relation validation happens before a token is issued.
set role authenticated;
select test_support.expect_error(
  format('select public.prepare_inventory_json_import(%L::jsonb,''add'',''{}'')',test_support.document(jsonb_build_array(test_support.full_product('40000000-0000-4000-8000-000000000099','缺圖商品','products/missing.webp',1,null)))::text),
  'invalid or missing image'
);
select test_support.expect_error(
  format('select public.prepare_inventory_json_import(%L::jsonb,''add'',''{}'')',test_support.document(jsonb_build_array(test_support.full_product('40000000-0000-4000-8000-000000000098','錯誤品牌','products/c.webp',1,null) || jsonb_build_object('brand',jsonb_build_object('id','20000000-0000-4000-8000-000000000001','name','不存在品牌'))))::text),
  'brand mismatch'
);
reset role;
select 'PASS image_and_relation_validation';

-- Force a restore insert failure after the restore RPC has deleted rows.
-- The caught exception runs in a PL/pgSQL subtransaction; all deletes,
-- inserts, and the restore-before backup must disappear together.
select id as atomic_restore_backup from inventory_private.inventory_backups order by created_at desc,id desc limit 1 \gset
set role authenticated;
select (public.prepare_inventory_backup_restore(:'atomic_restore_backup')->'execution'->>'previewToken') as atomic_restore_token \gset
reset role;
select inventory_private.current_product_state_hash() as state_before_failed_restore \gset
select count(*) as backups_before_failed_restore from inventory_private.inventory_backups \gset
create function test_support.fail_restore_insert() returns trigger language plpgsql as $$
begin if new.name='商品 B' then raise exception 'forced restore insert failure'; end if; return new; end;
$$;
create trigger test_fail_restore before insert on public.products for each row execute function test_support.fail_restore_insert();
set role authenticated;
select test_support.expect_error(
  format('select public.commit_inventory_backup_restore(%L,%L,''RESTORE'')',:'atomic_restore_token','60000000-0000-4000-8000-000000000004'),
  'forced restore insert failure'
);
reset role;
drop trigger test_fail_restore on public.products;
drop function test_support.fail_restore_insert();
select test_support.assert_true(inventory_private.current_product_state_hash()=:'state_before_failed_restore','failed restore left products and tags unchanged');
select test_support.assert_true((select count(*) from inventory_private.inventory_backups)=:'backups_before_failed_restore','failed restore backup rolled back');
select 'PASS restore_all_or_nothing_rollback';

set role authenticated;
select test_support.assert_true(exists(select 1 from public.inventory_referenced_image_paths() where path='products/b.webp'),'retained snapshots still protect B image');
reset role;
select test_support.assert_true((select payload from other_site.records where id=1)='must remain unchanged','other-site sentinel final check');
select 'PASS final_image_and_other_site_checks';
