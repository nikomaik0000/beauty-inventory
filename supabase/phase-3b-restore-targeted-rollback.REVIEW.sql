-- BEAUTY INVENTORY PHASE 3B TARGETED RESTORE — ROLLBACK REVIEW COPY
-- DO NOT EXECUTE AS-IS AS A PRODUCTION CHANGE.
-- The safe default final ROLLBACK preserves v2. Changing it to COMMIT would
-- restore the original v1 RPC, including its Supabase-safeupdate incompatibility.
-- No product, snapshot, preview, batch, or Storage row is changed by this file.

begin;

select pg_advisory_xact_lock(hashtext('beauty-inventory-phase-3b-json-import-backup'));
select pg_advisory_xact_lock(hashtext('beauty-inventory-products'));

do $$
declare
  restore_function oid :=
    to_regprocedure('public.commit_inventory_backup_restore(uuid,uuid,text)');
begin
  if restore_function is null
     or obj_description(restore_function, 'pg_proc') is distinct from
       'beauty-inventory:phase-3b:commit_inventory_backup_restore:v2'
     or not exists (
       select 1 from pg_proc function_object
       where function_object.oid = restore_function
         and function_object.prosecdef
         and position('delete from public.products product_row'
                      in lower(function_object.prosrc)) > 0
         and position('delete from public.product_tags product_tag'
                      in lower(function_object.prosrc)) > 0
     ) then
    raise exception 'Phase 3B targeted restore rollback refused: v2 RPC does not match';
  end if;

  perform set_config(
    'beauty_inventory.restore_rollback_inventory_fingerprint',
    md5(
      coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text
                from public.products p), '[]') ||
      coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id, pt.tag_id)::text
                from public.product_tags pt), '[]')
    ), true
  );
  perform set_config(
    'beauty_inventory.restore_rollback_backup_count',
    (select count(*)::text from inventory_private.inventory_backups), true
  );
end
$$;

create or replace function public.commit_inventory_backup_restore(
  p_preview_token uuid,
  p_idempotency_key uuid,
  p_confirmation_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := inventory_private.assert_inventory_user();
  v_preview inventory_private.inventory_json_previews;
  v_prior jsonb;
  v_before uuid;
  v_result jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('beauty-inventory-products'));
  select result into v_prior from inventory_private.inventory_import_batches where user_id=v_user and idempotency_key=p_idempotency_key;
  if v_prior is not null then return jsonb_set(v_prior,'{status}','"already-applied"'); end if;
  select * into v_preview from inventory_private.inventory_json_previews where token=p_preview_token for update;
  if v_preview.token is null or v_preview.user_id<>v_user or v_preview.kind<>'restore' then raise exception 'invalid restore preview'; end if;
  if v_preview.consumed_at is not null or v_preview.expires_at<=now() then raise exception 'restore preview expired'; end if;
  if v_preview.state_hash<>inventory_private.current_product_state_hash() then raise exception 'inventory changed; preview restore again'; end if;
  if p_confirmation_text<>'RESTORE' then raise exception 'restore confirmation mismatch'; end if;
  v_before:=inventory_private.create_product_backup('restore',(v_preview.summary->>'new')::integer+(v_preview.summary->>'update')::integer+(v_preview.summary->>'delete')::integer);

  delete from public.products;
  insert into public.products(id,name,brand_id,category_id,subcategory_id,image_url,expiration_type,expiration_date,opened,opened_date,pao_months,capacity,quantity,notes,created_at,updated_at)
  select (row_data->>'id')::uuid,row_data->>'name',nullif(row_data->>'brand_id','')::uuid,nullif(row_data->>'category_id','')::uuid,nullif(row_data->>'subcategory_id','')::uuid,row_data->>'image_url',(row_data->>'expiration_type')::public.expiration_type,nullif(row_data->>'expiration_date','')::date,(row_data->>'opened')::boolean,nullif(row_data->>'opened_date','')::date,(row_data->>'pao_months')::integer,(row_data->>'capacity')::numeric,(row_data->>'quantity')::integer,row_data->>'notes',(row_data->>'created_at')::timestamptz,(row_data->>'updated_at')::timestamptz
  from inventory_private.inventory_backup_products where backup_id=v_preview.backup_id;
  insert into public.product_tags(product_id,tag_id)
  select product_id,tag_id from inventory_private.inventory_backup_product_tags where backup_id=v_preview.backup_id;

  v_result:=jsonb_build_object('status','applied','operation','restore','created',(v_preview.summary->>'new')::integer,'updated',(v_preview.summary->>'update')::integer,'deleted',(v_preview.summary->>'delete')::integer,'unchanged',(v_preview.summary->>'unchanged')::integer,'backupId',v_before);
  insert into inventory_private.inventory_import_batches values(v_user,p_idempotency_key,p_preview_token,'restore',v_result,now());
  update inventory_private.inventory_json_previews set consumed_at=now() where token=p_preview_token;
  perform inventory_private.prune_product_backups();
  return v_result;
end;
$$;

comment on function public.commit_inventory_backup_restore(uuid,uuid,text) is
  'beauty-inventory:phase-3b:commit_inventory_backup_restore:v1';

revoke all on function public.commit_inventory_backup_restore(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.commit_inventory_backup_restore(uuid,uuid,text)
  to authenticated;

do $$
declare
  restore_function oid :=
    to_regprocedure('public.commit_inventory_backup_restore(uuid,uuid,text)');
  current_inventory_fingerprint text;
begin
  select md5(
    coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text
              from public.products p), '[]') ||
    coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id, pt.tag_id)::text
              from public.product_tags pt), '[]')
  ) into current_inventory_fingerprint;

  if restore_function is null
     or obj_description(restore_function, 'pg_proc') is distinct from
       'beauty-inventory:phase-3b:commit_inventory_backup_restore:v1'
     or not exists (
       select 1 from pg_proc
       where oid = restore_function
         and position('delete from public.products;' in lower(prosrc)) > 0
     )
     or current_inventory_fingerprint is distinct from
       current_setting('beauty_inventory.restore_rollback_inventory_fingerprint')
     or (select count(*) from inventory_private.inventory_backups) <> current_setting(
       'beauty_inventory.restore_rollback_backup_count'
     )::bigint then
    raise exception 'Phase 3B targeted restore rollback postcondition failed';
  end if;
end
$$;

-- SAFE DEFAULT. Leave this as ROLLBACK during review and normal operation.
rollback;

