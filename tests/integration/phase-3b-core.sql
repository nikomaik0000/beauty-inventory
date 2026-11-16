\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

create function test_support.full_product(
  p_id text,
  p_name text,
  p_image text,
  p_quantity integer,
  p_notes text
) returns jsonb language sql as $$
  select jsonb_build_object(
    'id',p_id,'name',p_name,
    'brand',jsonb_build_object('id','20000000-0000-4000-8000-000000000001','name','測試品牌'),
    'category',jsonb_build_object('id','10000000-0000-4000-8000-000000000001','name','保養'),
    'subcategory',jsonb_build_object('id','11000000-0000-4000-8000-000000000001','name','化妝水'),
    'capacity',100,'quantity',p_quantity,
    'expiration',jsonb_build_object('type','dated','date','2028-12-31'),
    'paoMonths',12,'notes',p_notes,
    'image',jsonb_build_object('storagePath',p_image),
    'legacy',jsonb_build_object('opened',false,'openedDate',null),
    'createdAt','2026-01-01T00:00:00.000Z','updatedAt','2026-01-01T00:00:00.000Z'
  );
$$;
create function test_support.document(p_products jsonb)
returns jsonb language sql as $$
  select jsonb_build_object('format','beauty-inventory/products','version',1,'exportedAt','2026-11-16T00:00:00.000Z','products',p_products);
$$;
grant execute on function test_support.full_product(text,text,text,integer,text),test_support.document(jsonb) to authenticated;

-- Phase 2 atomic stock RPC.
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set role authenticated;
select test_support.assert_true(public.adjust_product_quantity('40000000-0000-4000-8000-000000000001',1)=3,'Phase 2 +1');
select test_support.assert_true(public.adjust_product_quantity('40000000-0000-4000-8000-000000000001',-1)=2,'Phase 2 -1');
update public.products set quantity=0 where id='40000000-0000-4000-8000-000000000001';
select test_support.expect_error($q$select public.adjust_product_quantity('40000000-0000-4000-8000-000000000001',-1)$q$,'below zero');
select test_support.expect_error($q$select public.adjust_product_quantity('40000000-0000-4000-8000-000000000001',2)$q$,'must be -1 or 1');
update public.products set quantity=2 where id='40000000-0000-4000-8000-000000000001';
reset role;
select 'PASS phase2_atomic_and_nonnegative';

-- Unauthorized Phase 2 caller cannot see or modify the protected row.
set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
set role authenticated;
select test_support.expect_error($q$select public.adjust_product_quantity('40000000-0000-4000-8000-000000000001',1)$q$,'product not found');
reset role;
select test_support.assert_true((select quantity from public.products where id='40000000-0000-4000-8000-000000000001')=2,'outsider did not change stock');
select 'PASS phase2_unauthorized_denied';

-- JSON add and idempotent retry.
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set role authenticated;
select (public.prepare_inventory_json_import(
  test_support.document(jsonb_build_array(test_support.full_product('40000000-0000-4000-8000-000000000002','商品 B','products/b.webp',3,'原始 B'))),
  'add','{}'
)->>'preview_token') as add_token \gset
select (public.commit_inventory_json_import(:'add_token','50000000-0000-4000-8000-000000000001','')->>'status') as add_status \gset
select test_support.assert_true(:'add_status'='applied','add applied');
select test_support.assert_true((select count(*) from public.products where id='40000000-0000-4000-8000-000000000002')=1,'B inserted once');
select (public.commit_inventory_json_import(:'add_token','50000000-0000-4000-8000-000000000001','')->>'status') as retry_status \gset
select test_support.assert_true(:'retry_status'='already-applied','idempotent retry result');
select test_support.assert_true((select count(*) from public.products where id='40000000-0000-4000-8000-000000000002')=1,'retry did not duplicate');
reset role;
select 'PASS add_and_idempotent_retry';

-- UUID collision and generated UUID behavior.
set role authenticated;
select test_support.expect_error(
  format('select public.prepare_inventory_json_import(%L::jsonb,''add'',''{}'')',test_support.document(jsonb_build_array(test_support.full_product('40000000-0000-4000-8000-000000000001','碰撞','products/a.webp',1,null)))::text),
  'already exists'
);
select (public.prepare_inventory_json_import(
  test_support.document(jsonb_build_array(test_support.full_product(null,'無 UUID 新品','products/c.webp',1,null))),
  'add','{}'
)->>'preview_token') as generated_token \gset
select public.commit_inventory_json_import(:'generated_token','50000000-0000-4000-8000-000000000002','');
select test_support.assert_true((select count(*) from public.products where name='無 UUID 新品' and id is not null)=1,'database generated UUID');
reset role;
select 'PASS uuid_collision_and_generation';

-- Partial update: omitted fields stay unchanged, explicit null clears notes.
set role authenticated;
select (public.prepare_inventory_json_import(
  test_support.document(jsonb_build_array(jsonb_build_object('id','40000000-0000-4000-8000-000000000002','quantity',5,'notes',null))),
  'update','{}'
)->>'preview_token') as update_token \gset
select public.commit_inventory_json_import(:'update_token','50000000-0000-4000-8000-000000000003','');
select test_support.assert_true((select name='商品 B' and quantity=5 and notes is null from public.products where id='40000000-0000-4000-8000-000000000002'),'partial update semantics');
reset role;
select 'PASS update_missing_vs_null';

-- Stale preview after data mutation.
set role authenticated;
select (public.prepare_inventory_json_import(test_support.document(jsonb_build_array(jsonb_build_object('id','40000000-0000-4000-8000-000000000002','quantity',6))),'update','{}')->>'preview_token') as stale_token \gset
update public.products set quantity=7 where id='40000000-0000-4000-8000-000000000002';
select test_support.expect_error(format('select public.commit_inventory_json_import(%L,%L,'''')',:'stale_token','50000000-0000-4000-8000-000000000004'),'inventory changed');
update public.products set quantity=5 where id='40000000-0000-4000-8000-000000000002';
reset role;
select 'PASS stale_preview_rejected';

-- Expired token.
set role authenticated;
select (public.prepare_inventory_json_import(test_support.document(jsonb_build_array(jsonb_build_object('id','40000000-0000-4000-8000-000000000002','quantity',6))),'update','{}')->>'preview_token') as expired_token \gset
reset role;
update inventory_private.inventory_json_previews set expires_at=now()-interval '1 minute' where token=:'expired_token';
set role authenticated;
select test_support.expect_error(format('select public.commit_inventory_json_import(%L,%L,'''')',:'expired_token','50000000-0000-4000-8000-000000000005'),'expired');
reset role;
select 'PASS expired_preview_rejected';

-- Forced error on the second row proves product changes and pre-import backup roll back together.
set role authenticated;
select (public.prepare_inventory_json_import(
  test_support.document(jsonb_build_array(
    jsonb_build_object('id','40000000-0000-4000-8000-000000000001','notes','rollback-first'),
    jsonb_build_object('id','40000000-0000-4000-8000-000000000002','name','TRIGGER_FAIL')
  )),'update','{}'
)->>'preview_token') as rollback_token \gset
reset role;
select count(*) as backup_before_rollback from inventory_private.inventory_backups \gset
create function test_support.fail_second_product() returns trigger language plpgsql as $$
begin if new.name='TRIGGER_FAIL' then raise exception 'forced second row failure'; end if; return new; end;
$$;
create trigger test_fail_second before update on public.products for each row execute function test_support.fail_second_product();
set role authenticated;
select test_support.expect_error(format('select public.commit_inventory_json_import(%L,%L,'''')',:'rollback_token','50000000-0000-4000-8000-000000000006'),'forced second row failure');
reset role;
drop trigger test_fail_second on public.products;
drop function test_support.fail_second_product();
select test_support.assert_true((select notes='原始 A' from public.products where id='40000000-0000-4000-8000-000000000001'),'first row rolled back');
select test_support.assert_true((select name='商品 B' from public.products where id='40000000-0000-4000-8000-000000000002'),'second row rolled back');
select test_support.assert_true((select count(*) from inventory_private.inventory_backups)=:'backup_before_rollback','backup rolled back');
select 'PASS all_or_nothing_rollback';

-- Replace only products, preserve taxonomy/tags/other-site table, and retain deleted image via backup.
set role authenticated;
select (public.prepare_inventory_json_import(
  test_support.document(jsonb_build_array(
    test_support.full_product('40000000-0000-4000-8000-000000000001','商品 A','products/a.webp',9,'取代後 A'),
    test_support.full_product('40000000-0000-4000-8000-000000000003','商品 C','products/c.webp',1,'新增 C')
  )),'replace','{}'
)->>'preview_token') as replace_token \gset
select public.commit_inventory_json_import(:'replace_token','50000000-0000-4000-8000-000000000007','REPLACE 2');
reset role;
select test_support.assert_true((select count(*) from public.products)=2,'replace product count');
select test_support.assert_true(not exists(select 1 from public.products where id='40000000-0000-4000-8000-000000000002'),'B removed');
select test_support.assert_true((select count(*) from public.categories)=1 and (select count(*) from public.subcategories)=1 and (select count(*) from public.brands)=1 and (select count(*) from public.tags)=1,'taxonomy preserved');
select test_support.assert_true((select payload from other_site.records where id=1)='must remain unchanged','other site sentinel unchanged');
set role authenticated;
select test_support.assert_true(exists(select 1 from public.inventory_referenced_image_paths() where path='products/b.webp'),'backup protects B image');
reset role;
select id as replace_backup from inventory_private.inventory_backups where operation='replace' order by created_at desc limit 1 \gset
select test_support.assert_true(not exists(select 1 from inventory_private.inventory_backup_products where backup_id=:'replace_backup' and row_data->>'image_url' like '%token=%'),'snapshot contains object paths, not signed URLs');
select 'PASS replace_taxonomy_isolation_and_image_protection';

-- Restore preview + atomic restore; restore itself creates a new snapshot.
set role authenticated;
select (public.prepare_inventory_backup_restore(:'replace_backup')->'execution'->>'previewToken') as restore_token \gset
select public.commit_inventory_backup_restore(:'restore_token','50000000-0000-4000-8000-000000000008','RESTORE');
reset role;
select test_support.assert_true(exists(select 1 from public.products where id='40000000-0000-4000-8000-000000000002'),'B restored');
select test_support.assert_true(not exists(select 1 from public.products where id='40000000-0000-4000-8000-000000000003'),'C removed by restore');
select test_support.assert_true(exists(select 1 from public.product_tags where product_id='40000000-0000-4000-8000-000000000001' and tag_id='30000000-0000-4000-8000-000000000001'),'product tag restored');
select test_support.assert_true(exists(select 1 from inventory_private.inventory_backups where operation='restore'),'restore-before snapshot exists');
select 'PASS backup_restore_complete';

-- Keep the newest ten backups, never pruning the newest snapshot.
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare i integer; doc jsonb; prepared jsonb; newest uuid;
begin
  for i in 1..12 loop
    doc:=test_support.document(jsonb_build_array(jsonb_build_object('id','40000000-0000-4000-8000-000000000001','quantity',10+i)));
    prepared:=public.prepare_inventory_json_import(doc,'update','{}');
    perform public.commit_inventory_json_import((prepared->>'preview_token')::uuid,gen_random_uuid(),'');
  end loop;
  select id into newest from inventory_private.inventory_backups order by created_at desc,id desc limit 1;
  perform test_support.assert_true((select count(*) from inventory_private.inventory_backups)=10,'retains exactly newest ten');
  perform test_support.assert_true(exists(select 1 from inventory_private.inventory_backups where id=newest),'newest backup retained');
end;
$$;
select 'PASS backup_retention';

-- Database RPC authorization and actual permission denial.
select test_support.assert_true(not has_function_privilege('anon','public.commit_inventory_json_import(uuid,uuid,text)','execute'),'anon has no commit execute');
set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
set role authenticated;
select test_support.expect_error('select * from public.list_inventory_backups()','access denied');
reset role;
set role anon;
select test_support.expect_error('select public.commit_inventory_json_import(''00000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000002'','''')','permission denied');
reset role;
select 'PASS unauthorized_rpc_denied';

select test_support.assert_true((select payload from other_site.records where id=1)='must remain unchanged','final other site sentinel unchanged');
select 'PASS other_site_unchanged';
