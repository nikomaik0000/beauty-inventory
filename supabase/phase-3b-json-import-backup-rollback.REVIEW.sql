-- BEAUTY INVENTORY PHASE 3B — ROLLBACK REVIEW COPY
-- DO NOT EXECUTE AS-IS AS A PRODUCTION CHANGE.
-- This rollback permanently deletes all Phase 3B preview, idempotency-batch,
-- snapshot, and snapshot-product records if its final statement is authorized
-- and changed to COMMIT. It does not revert product changes already applied by
-- an import/restore. The default final ROLLBACK keeps all objects and records.
begin;
select pg_advisory_xact_lock(hashtext('beauty-inventory-phase-3b-json-import-backup'));

do $$
declare
  object_signature text;
  internal_table text;
begin
  foreach internal_table in array array[
    'inventory_backups',
    'inventory_backup_products',
    'inventory_backup_product_tags',
    'inventory_json_previews',
    'inventory_import_batches'
  ] loop
    if to_regclass('inventory_private.' || internal_table) is null
       or obj_description(
         to_regclass('inventory_private.' || internal_table), 'pg_class'
       ) is distinct from
         'beauty-inventory:phase-3b:' || internal_table || ':v1' then
      raise exception 'Phase 3B rollback refused: table % is missing or not owned',
        internal_table;
    end if;
  end loop;

  foreach object_signature in array array[
    'inventory_private.assert_inventory_user()',
    'inventory_private.image_object_path(text)',
    'inventory_private.product_snapshot(public.products)',
    'inventory_private.current_product_state_hash()',
    'inventory_private.product_matches_json(public.products,jsonb)',
    'inventory_private.create_product_backup(text,integer)',
    'inventory_private.prune_product_backups()',
    'public.prepare_inventory_json_import(jsonb,text,integer[])',
    'public.commit_inventory_json_import(uuid,uuid,text)',
    'public.list_inventory_backups()',
    'public.prepare_inventory_backup_restore(uuid)',
    'public.commit_inventory_backup_restore(uuid,uuid,text)',
    'public.inventory_referenced_image_paths()'
  ] loop
    if to_regprocedure(object_signature) is null
       or obj_description(to_regprocedure(object_signature), 'pg_proc') not like
         'beauty-inventory:phase-3b:%:v1' then
      raise exception 'Phase 3B rollback refused: function % is missing or not owned',
        object_signature;
    end if;
  end loop;
end
$$;

revoke all on function public.prepare_inventory_json_import(jsonb,text,integer[]) from public,anon,authenticated;
revoke all on function public.commit_inventory_json_import(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.list_inventory_backups() from public,anon,authenticated;
revoke all on function public.prepare_inventory_backup_restore(uuid) from public,anon,authenticated;
revoke all on function public.commit_inventory_backup_restore(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.inventory_referenced_image_paths() from public,anon,authenticated;
drop function public.prepare_inventory_json_import(jsonb,text,integer[]);
drop function public.commit_inventory_json_import(uuid,uuid,text);
drop function public.list_inventory_backups();
drop function public.prepare_inventory_backup_restore(uuid);
drop function public.commit_inventory_backup_restore(uuid,uuid,text);
drop function public.inventory_referenced_image_paths();
drop table inventory_private.inventory_import_batches;
drop table inventory_private.inventory_json_previews;
drop table inventory_private.inventory_backup_product_tags;
drop table inventory_private.inventory_backup_products;
drop table inventory_private.inventory_backups;
drop function inventory_private.prune_product_backups();
drop function inventory_private.create_product_backup(text,integer);
drop function inventory_private.product_matches_json(public.products,jsonb);
drop function inventory_private.current_product_state_hash();
drop function inventory_private.product_snapshot(public.products);
drop function inventory_private.image_object_path(text);
drop function inventory_private.assert_inventory_user();

-- SAFE DEFAULT. A separately authorized destructive rollback must review the
-- current snapshot count and change only this final statement to COMMIT.
rollback;
