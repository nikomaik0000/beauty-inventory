-- BEAUTY INVENTORY PHASE 3B — TARGETED RESTORE PRODUCTION PATCH
-- Incremental patch only. Do not rerun the full Phase 3B installation SQL.
-- Replaces only public.commit_inventory_backup_restore(uuid,uuid,text), keeps
-- every snapshot/runtime table, and performs no product or Storage mutation.

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
       'beauty-inventory:phase-3b:commit_inventory_backup_restore:v1'
     or not exists (
       select 1
       from pg_proc function_object
       join pg_language function_language
         on function_language.oid = function_object.prolang
       where function_object.oid = restore_function
         and function_language.lanname = 'plpgsql'
         and function_object.prosecdef
         and position(
           'delete from public.products;'
           in lower(function_object.prosrc)
         ) > 0
     ) then
    raise exception 'Phase 3B restore patch refused: installed v1 RPC does not match';
  end if;

  if not coalesce(has_function_privilege(
       'authenticated', restore_function, 'execute'
     ), false)
     or coalesce(has_function_privilege('anon', restore_function, 'execute'), true)
     or to_regprocedure('public.is_inventory_user()') is null
     or to_regclass('inventory_private.allowed_users') is null then
    raise exception 'Phase 3B restore patch refused: authorization metadata differs';
  end if;

  if exists (
    select 1
    from pg_constraint constraint_object
    where constraint_object.contype = 'f'
      and constraint_object.confrelid = 'public.products'::regclass
      and not (
        constraint_object.conrelid = 'public.product_tags'::regclass
        and constraint_object.confdeltype = 'c'
      )
  ) then
    raise exception 'Phase 3B restore patch refused: unexpected table references public.products';
  end if;

  perform set_config(
    'beauty_inventory.restore_patch_inventory_fingerprint',
    md5(
      coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text
                from public.products p), '[]') ||
      coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id, pt.tag_id)::text
                from public.product_tags pt), '[]')
    ), true
  );
  perform set_config(
    'beauty_inventory.restore_patch_image_fingerprint',
    coalesce((select md5(string_agg(name, '|' order by name))
              from storage.objects where bucket_id = 'product-images'), md5('')),
    true
  );
  perform set_config(
    'beauty_inventory.restore_patch_backup_count',
    (select count(*)::text from inventory_private.inventory_backups), true
  );
  perform set_config(
    'beauty_inventory.restore_patch_preview_count',
    (select count(*)::text from inventory_private.inventory_json_previews), true
  );
  perform set_config(
    'beauty_inventory.restore_patch_batch_count',
    (select count(*)::text from inventory_private.inventory_import_batches), true
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
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('beauty-inventory-products')
  );
  select result into v_prior
  from inventory_private.inventory_import_batches
  where user_id = v_user and idempotency_key = p_idempotency_key;
  if v_prior is not null then
    return jsonb_set(v_prior, '{status}', '"already-applied"');
  end if;

  select * into v_preview
  from inventory_private.inventory_json_previews
  where token = p_preview_token
  for update;
  if v_preview.token is null
     or v_preview.user_id <> v_user
     or v_preview.kind <> 'restore' then
    raise exception 'invalid restore preview';
  end if;
  if v_preview.consumed_at is not null or v_preview.expires_at <= now() then
    raise exception 'restore preview expired';
  end if;
  if v_preview.state_hash <> inventory_private.current_product_state_hash() then
    raise exception 'inventory changed; preview restore again';
  end if;
  if p_confirmation_text <> 'RESTORE' then
    raise exception 'restore confirmation mismatch';
  end if;

  v_before := inventory_private.create_product_backup(
    'restore',
    (v_preview.summary->>'new')::integer +
    (v_preview.summary->>'update')::integer +
    (v_preview.summary->>'delete')::integer
  );

  delete from public.products product_row
  where not exists (
    select 1
    from inventory_private.inventory_backup_products backup_product
    where backup_product.backup_id = v_preview.backup_id
      and backup_product.product_id = product_row.id
  )
  or exists (
    select 1
    from inventory_private.inventory_backup_products backup_product
    where backup_product.backup_id = v_preview.backup_id
      and backup_product.product_id = product_row.id
      and (backup_product.row_data - 'updated_at') <>
          (inventory_private.product_snapshot(product_row) - 'updated_at')
  );

  insert into public.products(
    id,name,brand_id,category_id,subcategory_id,image_url,expiration_type,
    expiration_date,opened,opened_date,pao_months,capacity,quantity,notes,
    created_at,updated_at
  )
  select
    (backup_product.row_data->>'id')::uuid,
    backup_product.row_data->>'name',
    nullif(backup_product.row_data->>'brand_id','')::uuid,
    nullif(backup_product.row_data->>'category_id','')::uuid,
    nullif(backup_product.row_data->>'subcategory_id','')::uuid,
    backup_product.row_data->>'image_url',
    (backup_product.row_data->>'expiration_type')::public.expiration_type,
    nullif(backup_product.row_data->>'expiration_date','')::date,
    (backup_product.row_data->>'opened')::boolean,
    nullif(backup_product.row_data->>'opened_date','')::date,
    (backup_product.row_data->>'pao_months')::integer,
    (backup_product.row_data->>'capacity')::numeric,
    (backup_product.row_data->>'quantity')::integer,
    backup_product.row_data->>'notes',
    (backup_product.row_data->>'created_at')::timestamptz,
    (backup_product.row_data->>'updated_at')::timestamptz
  from inventory_private.inventory_backup_products backup_product
  where backup_product.backup_id = v_preview.backup_id
    and not exists (
      select 1 from public.products product_row
      where product_row.id = backup_product.product_id
    );

  delete from public.product_tags product_tag
  where not exists (
    select 1
    from inventory_private.inventory_backup_product_tags backup_tag
    where backup_tag.backup_id = v_preview.backup_id
      and backup_tag.product_id = product_tag.product_id
      and backup_tag.tag_id = product_tag.tag_id
  );

  insert into public.product_tags(product_id,tag_id)
  select backup_tag.product_id, backup_tag.tag_id
  from inventory_private.inventory_backup_product_tags backup_tag
  where backup_tag.backup_id = v_preview.backup_id
    and not exists (
      select 1 from public.product_tags product_tag
      where product_tag.product_id = backup_tag.product_id
        and product_tag.tag_id = backup_tag.tag_id
    );

  if exists (
    select 1 from public.products product_row
    where not exists (
      select 1 from inventory_private.inventory_backup_products backup_product
      where backup_product.backup_id = v_preview.backup_id
        and backup_product.product_id = product_row.id
        and (backup_product.row_data - 'updated_at') =
            (inventory_private.product_snapshot(product_row) - 'updated_at')
    )
  ) or exists (
    select 1 from inventory_private.inventory_backup_products backup_product
    where backup_product.backup_id = v_preview.backup_id
      and not exists (
        select 1 from public.products product_row
        where product_row.id = backup_product.product_id
      )
  ) or exists (
    (select product_tag.product_id, product_tag.tag_id
     from public.product_tags product_tag
     except
     select backup_tag.product_id, backup_tag.tag_id
     from inventory_private.inventory_backup_product_tags backup_tag
     where backup_tag.backup_id = v_preview.backup_id)
    union all
    (select backup_tag.product_id, backup_tag.tag_id
     from inventory_private.inventory_backup_product_tags backup_tag
     where backup_tag.backup_id = v_preview.backup_id
     except
     select product_tag.product_id, product_tag.tag_id
     from public.product_tags product_tag)
  ) then
    raise exception 'restore postcondition failed';
  end if;

  v_result := jsonb_build_object(
    'status','applied','operation','restore',
    'created',(v_preview.summary->>'new')::integer,
    'updated',(v_preview.summary->>'update')::integer,
    'deleted',(v_preview.summary->>'delete')::integer,
    'unchanged',(v_preview.summary->>'unchanged')::integer,
    'backupId',v_before
  );
  insert into inventory_private.inventory_import_batches
  values(v_user,p_idempotency_key,p_preview_token,'restore',v_result,now());
  update inventory_private.inventory_json_previews
  set consumed_at = now()
  where token = p_preview_token;
  perform inventory_private.prune_product_backups();
  return v_result;
end;
$$;

comment on function public.commit_inventory_backup_restore(uuid,uuid,text) is
  'beauty-inventory:phase-3b:commit_inventory_backup_restore:v2';

revoke all on function public.commit_inventory_backup_restore(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.commit_inventory_backup_restore(uuid,uuid,text)
  to authenticated;

do $$
declare
  restore_function oid :=
    to_regprocedure('public.commit_inventory_backup_restore(uuid,uuid,text)');
  current_inventory_fingerprint text;
  current_image_fingerprint text;
begin
  select md5(
    coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text
              from public.products p), '[]') ||
    coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id, pt.tag_id)::text
              from public.product_tags pt), '[]')
  ) into current_inventory_fingerprint;
  select coalesce((select md5(string_agg(name, '|' order by name))
                   from storage.objects where bucket_id = 'product-images'), md5(''))
  into current_image_fingerprint;

  if restore_function is null
     or obj_description(restore_function, 'pg_proc') is distinct from
       'beauty-inventory:phase-3b:commit_inventory_backup_restore:v2'
     or exists (
       select 1 from pg_proc
       where oid = restore_function
         and position('delete from public.products;' in lower(prosrc)) > 0
     )
     or not coalesce(has_function_privilege(
       'authenticated', restore_function, 'execute'
     ), false)
     or coalesce(has_function_privilege('anon', restore_function, 'execute'), true)
     or current_inventory_fingerprint is distinct from
       current_setting('beauty_inventory.restore_patch_inventory_fingerprint')
     or current_image_fingerprint is distinct from
       current_setting('beauty_inventory.restore_patch_image_fingerprint')
     or (select count(*) from inventory_private.inventory_backups) <> current_setting(
       'beauty_inventory.restore_patch_backup_count'
     )::bigint
     or (select count(*) from inventory_private.inventory_json_previews) <> current_setting(
       'beauty_inventory.restore_patch_preview_count'
     )::bigint
     or (select count(*) from inventory_private.inventory_import_batches) <> current_setting(
       'beauty_inventory.restore_patch_batch_count'
     )::bigint then
    raise exception 'Phase 3B restore patch postcondition failed; transaction rolled back';
  end if;
end
$$;

commit;

