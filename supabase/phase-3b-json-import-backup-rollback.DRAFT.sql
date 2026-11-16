-- Phase 3B rollback DRAFT — destructive to Phase 3B preview/batch/backup metadata.
-- DO NOT RUN until every retained inventory backup has been downloaded and a
-- native database + Storage backup has been verified. This does not alter
-- products, taxonomy, tags, Auth, RLS, or Storage objects.
begin;
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
commit;
