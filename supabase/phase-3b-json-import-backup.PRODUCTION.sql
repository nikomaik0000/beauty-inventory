-- BEAUTY INVENTORY PHASE 3B — REVIEWED PRODUCTION FORWARD
-- Derived from phase-3b-json-import-backup.DRAFT.sql without changing its RPC
-- behavior. Run only after the separate read-only preflight returns all PASS.
-- Every public RPC checks the database-side allowlist. Installation creates
-- only the five named inventory_private tables, seven private helpers, and six
-- public Phase 3B RPCs listed in the preflight.

begin;

select pg_advisory_xact_lock(hashtext('beauty-inventory-phase-3b-json-import-backup'));

do $$
declare
  object_signature text;
  internal_table text;
begin
  if to_regprocedure('public.is_inventory_user()') is null
     or to_regclass('inventory_private.allowed_users') is null
     or not has_function_privilege(
       'authenticated', 'public.is_inventory_user()', 'execute'
     )
     or has_function_privilege('anon', 'public.is_inventory_user()', 'execute') then
    raise exception 'Phase 3B preflight failed: Phase 1 allowlist is incomplete';
  end if;

  if (select count(*)
      from pg_class relation_object
      join pg_namespace schema_object on schema_object.oid = relation_object.relnamespace
      where schema_object.nspname = 'public'
        and relation_object.relname in (
          'categories','subcategories','brands','tags','products','product_tags'
        )
        and relation_object.relrowsecurity) <> 6
     or (select count(*)
         from pg_policies
         where schemaname = 'public'
           and tablename in (
             'categories','subcategories','brands','tags','products','product_tags'
           )
           and policyname = 'inventory owner access'
           and roles = array['authenticated']::name[]) <> 6 then
    raise exception 'Phase 3B preflight failed: Phase 1 inventory RLS is incomplete';
  end if;

  if not exists (
    select 1
    from pg_proc function_object
    where function_object.oid =
      to_regprocedure('public.adjust_product_quantity(uuid,integer)')
      and not function_object.prosecdef
      and obj_description(function_object.oid, 'pg_proc') =
        'beauty-inventory:phase-2:adjust_product_quantity:v1'
  )
  or not exists (
    select 1
    from pg_constraint constraint_object
    where constraint_object.conrelid = 'public.products'::regclass
      and constraint_object.conname = 'products_quantity_nonnegative'
      and constraint_object.convalidated
      and obj_description(constraint_object.oid, 'pg_constraint') =
        'beauty-inventory:phase-2:products_quantity_nonnegative:v1'
  ) then
    raise exception 'Phase 3B preflight failed: Phase 2 inventory objects are incomplete';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-images' and public = false
  )
  or (select count(*)
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname in (
          'inventory owner read product images',
          'inventory owner upload product images',
          'inventory owner update product images',
          'inventory owner delete product images'
        )
        and roles = array['authenticated']::name[]) <> 4 then
    raise exception 'Phase 3B preflight failed: private product-images protection is incomplete';
  end if;

  foreach internal_table in array array[
    'inventory_backups',
    'inventory_backup_products',
    'inventory_backup_product_tags',
    'inventory_json_previews',
    'inventory_import_batches'
  ] loop
    if to_regclass('inventory_private.' || internal_table) is not null then
      raise exception 'Phase 3B preflight failed: table inventory_private.% already exists',
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
    if to_regprocedure(object_signature) is not null then
      raise exception 'Phase 3B preflight failed: function % already exists',
        object_signature;
    end if;
  end loop;

  perform set_config(
    'beauty_inventory.phase3b_inventory_fingerprint',
    md5(
      coalesce((
        select jsonb_agg(to_jsonb(product_row) order by product_row.id)::text
        from public.products product_row
      ), '[]') ||
      coalesce((
        select jsonb_agg(to_jsonb(product_tag_row)
          order by product_tag_row.product_id, product_tag_row.tag_id)::text
        from public.product_tags product_tag_row
      ), '[]')
    ),
    true
  );
  perform set_config(
    'beauty_inventory.phase3b_image_fingerprint',
    coalesce((
      select md5(string_agg(storage_object.name, '|' order by storage_object.name))
      from storage.objects storage_object
      where storage_object.bucket_id = 'product-images'
    ), md5('')),
    true
  );
end
$$;

create table inventory_private.inventory_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  operation text not null check (operation in ('add', 'update', 'replace', 'restore')),
  affected_count integer not null check (affected_count >= 0),
  product_count integer not null check (product_count >= 0),
  image_reference_count integer not null check (image_reference_count >= 0),
  created_at timestamptz not null default now()
);

create table inventory_private.inventory_backup_products (
  backup_id uuid not null references inventory_private.inventory_backups(id) on delete cascade,
  product_id uuid not null,
  row_data jsonb not null,
  primary key (backup_id, product_id)
);

create table inventory_private.inventory_backup_product_tags (
  backup_id uuid not null references inventory_private.inventory_backups(id) on delete cascade,
  product_id uuid not null,
  tag_id uuid not null,
  primary key (backup_id, product_id, tag_id)
);

create table inventory_private.inventory_json_previews (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('import', 'restore')),
  mode text not null check (mode in ('add', 'update', 'replace', 'restore')),
  payload jsonb not null,
  payload_hash text not null,
  state_hash text not null,
  summary jsonb not null,
  backup_id uuid references inventory_private.inventory_backups(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz
);

create table inventory_private.inventory_import_batches (
  user_id uuid not null,
  idempotency_key uuid not null,
  preview_token uuid not null,
  operation text not null check (operation in ('add', 'update', 'replace', 'restore')),
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

revoke all on table
  inventory_private.inventory_backups,
  inventory_private.inventory_backup_products,
  inventory_private.inventory_backup_product_tags,
  inventory_private.inventory_json_previews,
  inventory_private.inventory_import_batches
from public, anon, authenticated;

alter table inventory_private.inventory_backups enable row level security;
alter table inventory_private.inventory_backup_products enable row level security;
alter table inventory_private.inventory_backup_product_tags enable row level security;
alter table inventory_private.inventory_json_previews enable row level security;
alter table inventory_private.inventory_import_batches enable row level security;

comment on table inventory_private.inventory_backups is
  'beauty-inventory:phase-3b:inventory_backups:v1';
comment on table inventory_private.inventory_backup_products is
  'beauty-inventory:phase-3b:inventory_backup_products:v1';
comment on table inventory_private.inventory_backup_product_tags is
  'beauty-inventory:phase-3b:inventory_backup_product_tags:v1';
comment on table inventory_private.inventory_json_previews is
  'beauty-inventory:phase-3b:inventory_json_previews:v1';
comment on table inventory_private.inventory_import_batches is
  'beauty-inventory:phase-3b:inventory_import_batches:v1';

create function inventory_private.assert_inventory_user()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_inventory_user() then
    raise exception 'inventory access denied' using errcode = '42501';
  end if;
  return v_user;
end;
$$;

create function inventory_private.image_object_path(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_path text;
begin
  if p_value is null or btrim(p_value) = '' then return null; end if;
  v_path := split_part(p_value, '?', 1);
  if position('/storage/v1/object/' in v_path) > 0 then
    v_path := regexp_replace(v_path, '^.*/product-images/', '');
  end if;
  v_path := regexp_replace(v_path, '^/+', '');
  if v_path = '' or v_path like '%\%' or v_path like '%..%' or v_path like '%#%' then return null; end if;
  return v_path;
end;
$$;

create function inventory_private.product_snapshot(p_product public.products)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_set(
    to_jsonb(p_product),
    '{image_url}',
    coalesce(to_jsonb(inventory_private.image_object_path(p_product.image_url)), 'null'::jsonb),
    true
  );
$$;

create function inventory_private.current_product_state_hash()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select md5(
    coalesce((select jsonb_agg(inventory_private.product_snapshot(p) order by p.id)::text from public.products p), '[]') ||
    coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id, pt.tag_id)::text from public.product_tags pt), '[]')
  );
$$;

create function inventory_private.product_matches_json(p_product public.products, p_json jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (not (p_json ? 'name') or p_product.name = p_json->>'name') and
    (not (p_json ? 'brand') or p_product.brand_id is not distinct from nullif(p_json#>>'{brand,id}', '')::uuid) and
    (not (p_json ? 'category') or p_product.category_id is not distinct from nullif(p_json#>>'{category,id}', '')::uuid) and
    (not (p_json ? 'subcategory') or p_product.subcategory_id is not distinct from nullif(p_json#>>'{subcategory,id}', '')::uuid) and
    (not (p_json ? 'capacity') or p_product.capacity is not distinct from (p_json->>'capacity')::numeric) and
    (not (p_json ? 'quantity') or p_product.quantity = (p_json->>'quantity')::integer) and
    (not (p_json ? 'expiration') or (
      p_product.expiration_type::text = p_json#>>'{expiration,type}' and
      p_product.expiration_date is not distinct from nullif(p_json#>>'{expiration,date}', '')::date
    )) and
    (not (p_json ? 'paoMonths') or p_product.pao_months is not distinct from (p_json->>'paoMonths')::integer) and
    (not (p_json ? 'notes') or p_product.notes is not distinct from p_json->>'notes') and
    (not (p_json ? 'image') or inventory_private.image_object_path(p_product.image_url) is not distinct from p_json#>>'{image,storagePath}') and
    (not (p_json ? 'legacy') or (
      p_product.opened = (p_json#>>'{legacy,opened}')::boolean and
      p_product.opened_date is not distinct from nullif(p_json#>>'{legacy,openedDate}', '')::date
    ));
$$;

create function inventory_private.create_product_backup(p_operation text, p_affected_count integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_backup uuid;
  v_user uuid := inventory_private.assert_inventory_user();
begin
  insert into inventory_private.inventory_backups (
    user_id, operation, affected_count, product_count, image_reference_count
  )
  select v_user, p_operation, p_affected_count, count(*),
    count(*) filter (where inventory_private.image_object_path(image_url) is not null)
  from public.products
  returning id into v_backup;

  insert into inventory_private.inventory_backup_products (backup_id, product_id, row_data)
  select v_backup, id, inventory_private.product_snapshot(product_row) from public.products product_row;

  insert into inventory_private.inventory_backup_product_tags (backup_id, product_id, tag_id)
  select v_backup, product_id, tag_id from public.product_tags;

  return v_backup;
end;
$$;

create function inventory_private.prune_product_backups()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from inventory_private.inventory_backups
  where id in (
    select id from inventory_private.inventory_backups
    order by created_at desc, id desc
    offset 10
  );
$$;

create function public.prepare_inventory_json_import(
  p_document jsonb,
  p_mode text,
  p_confirmed_new_indexes integer[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := inventory_private.assert_inventory_user();
  v_products jsonb;
  v_product jsonb;
  v_normalized jsonb := '[]'::jsonb;
  v_id uuid;
  v_index integer;
  v_seen uuid[] := '{}';
  v_existing public.products;
  v_brand uuid;
  v_category uuid;
  v_subcategory uuid;
  v_image text;
  v_new integer := 0;
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_deleted integer := 0;
  v_state text;
  v_token uuid;
  v_expires timestamptz;
  v_summary jsonb;
begin
  if p_mode not in ('add', 'update', 'replace') then raise exception 'invalid import mode'; end if;
  if p_document->>'format' is distinct from 'beauty-inventory/products' or p_document->>'version' is distinct from '1' then
    raise exception 'unsupported JSON format or version';
  end if;
  if jsonb_typeof(p_document->'products') <> 'array' then raise exception 'products must be an array'; end if;
  v_products := p_document->'products';

  for v_product, v_index in
    select value, ordinality::integer - 1 from jsonb_array_elements(v_products) with ordinality
  loop
    if jsonb_typeof(v_product) <> 'object' then raise exception 'product % must be an object', v_index; end if;
    if p_mode <> 'update' and not (v_product ?& array['name','brand','category','subcategory','capacity','quantity','expiration','paoMonths','notes','image','legacy','createdAt','updatedAt']) then
      raise exception 'product % is incomplete', v_index;
    end if;
    if p_mode = 'update' and not (v_product ? 'id') then raise exception 'update product % requires id', v_index; end if;

    if v_product->>'id' is null or v_product->>'id' = '' then
      if p_mode <> 'add' then raise exception 'product % requires UUID in this mode', v_index; end if;
      v_id := gen_random_uuid();
    else
      v_id := (v_product->>'id')::uuid;
    end if;
    if v_id = any(v_seen) then raise exception 'duplicate product UUID at index %', v_index; end if;
    v_seen := array_append(v_seen, v_id);

    if v_product ? 'name' and (jsonb_typeof(v_product->'name') <> 'string' or btrim(v_product->>'name') = '') then raise exception 'invalid product name at index %', v_index; end if;
    if v_product ? 'quantity' and (jsonb_typeof(v_product->'quantity') <> 'number' or (v_product->>'quantity')::numeric <> trunc((v_product->>'quantity')::numeric) or (v_product->>'quantity')::numeric < 0) then raise exception 'invalid quantity at index %', v_index; end if;
    if v_product ? 'capacity' and jsonb_typeof(v_product->'capacity') <> 'null' and (jsonb_typeof(v_product->'capacity') <> 'number' or (v_product->>'capacity')::numeric < 0) then raise exception 'invalid capacity at index %', v_index; end if;
    if v_product ? 'paoMonths' and jsonb_typeof(v_product->'paoMonths') <> 'null' and (jsonb_typeof(v_product->'paoMonths') <> 'number' or (v_product->>'paoMonths')::numeric <> trunc((v_product->>'paoMonths')::numeric) or (v_product->>'paoMonths')::numeric < 0) then raise exception 'invalid PAO at index %', v_index; end if;
    if v_product ? 'notes' and jsonb_typeof(v_product->'notes') not in ('string','null') then raise exception 'invalid notes at index %',v_index; end if;
    if v_product ? 'createdAt' then perform (v_product->>'createdAt')::timestamptz; end if;
    if v_product ? 'updatedAt' then perform (v_product->>'updatedAt')::timestamptz; end if;
    if v_product ? 'expiration' then
      if v_product#>>'{expiration,type}' not in ('dated','none','unknown') then raise exception 'invalid expiration type at index %', v_index; end if;
      if v_product#>>'{expiration,type}' = 'dated' and nullif(v_product#>>'{expiration,date}', '')::date is null then raise exception 'dated product requires date at index %', v_index; end if;
      if v_product#>>'{expiration,type}' <> 'dated' and v_product#>>'{expiration,date}' is not null then raise exception 'non-dated product cannot have date at index %', v_index; end if;
    end if;
    if v_product ? 'legacy' then
      if jsonb_typeof(v_product->'legacy') <> 'object' or not ((v_product->'legacy') ?& array['opened','openedDate']) or jsonb_typeof(v_product#>'{legacy,opened}') <> 'boolean' then raise exception 'invalid legacy fields at index %',v_index; end if;
      if (v_product#>>'{legacy,opened}')::boolean and v_product#>>'{legacy,openedDate}' is null then raise exception 'opened product requires opened date at index %', v_index; end if;
      if v_product#>>'{legacy,openedDate}' is not null then perform (v_product#>>'{legacy,openedDate}')::date; end if;
    end if;

    select * into v_existing from public.products where id = v_id;

    v_brand := nullif(v_product#>>'{brand,id}', '')::uuid;
    v_category := nullif(v_product#>>'{category,id}', '')::uuid;
    v_subcategory := nullif(v_product#>>'{subcategory,id}', '')::uuid;
    if v_product ? 'brand' and jsonb_typeof(v_product->'brand') not in ('null','object') then raise exception 'invalid brand relation at index %',v_index; end if;
    if v_product ? 'category' and jsonb_typeof(v_product->'category') not in ('null','object') then raise exception 'invalid category relation at index %',v_index; end if;
    if v_product ? 'subcategory' and jsonb_typeof(v_product->'subcategory') not in ('null','object') then raise exception 'invalid subcategory relation at index %',v_index; end if;
    if jsonb_typeof(v_product->'brand') = 'object' and not ((v_product->'brand') ?& array['id','name']) then raise exception 'brand relation is incomplete at index %',v_index; end if;
    if jsonb_typeof(v_product->'category') = 'object' and not ((v_product->'category') ?& array['id','name']) then raise exception 'category relation is incomplete at index %',v_index; end if;
    if jsonb_typeof(v_product->'subcategory') = 'object' and not ((v_product->'subcategory') ?& array['id','name']) then raise exception 'subcategory relation is incomplete at index %',v_index; end if;
    if p_mode='update' and not (v_product ? 'category') then v_category:=v_existing.category_id; end if;
    if p_mode='update' and (v_product ? 'category') and not (v_product ? 'subcategory')
      and v_existing.subcategory_id is not null and v_category is distinct from v_existing.category_id then
      raise exception 'changing category requires an explicit subcategory value at index %',v_index;
    end if;
    if v_product ? 'brand' and v_brand is not null and not exists (select 1 from public.brands where id = v_brand and name = v_product#>>'{brand,name}') then raise exception 'brand mismatch at index %', v_index; end if;
    if v_product ? 'category' and v_category is not null and not exists (select 1 from public.categories where id = v_category and name = v_product#>>'{category,name}') then raise exception 'category mismatch at index %', v_index; end if;
    if v_product ? 'subcategory' and v_subcategory is not null and not exists (select 1 from public.subcategories where id = v_subcategory and category_id = v_category and name = v_product#>>'{subcategory,name}') then raise exception 'subcategory mismatch at index %', v_index; end if;

    if v_product ? 'image' then
      if jsonb_typeof(v_product->'image') <> 'object' or not ((v_product->'image') ? 'storagePath') then raise exception 'invalid image object at index %',v_index; end if;
      v_image := v_product#>>'{image,storagePath}';
      if v_image is not null and (
        inventory_private.image_object_path(v_image) is distinct from v_image or
        not exists (select 1 from storage.objects where bucket_id = 'product-images' and name = v_image)
      ) then raise exception 'invalid or missing image at index %', v_index; end if;
    end if;

    if p_mode = 'add' and v_existing.id is not null then raise exception 'add UUID already exists at index %', v_index; end if;
    if p_mode = 'update' and v_existing.id is null then raise exception 'update UUID does not exist at index %', v_index; end if;
    if p_mode in ('add','replace') and v_existing.id is null and v_product ? 'name' and exists (
      select 1 from public.products p
      where lower(btrim(p.name)) = lower(btrim(v_product->>'name'))
        and p.brand_id is not distinct from v_brand
        and p.id <> v_id
    ) and not (v_index = any(coalesce(p_confirmed_new_indexes, '{}'))) then
      raise exception 'possible duplicate requires confirmation at index %', v_index;
    end if;

    if v_existing.id is null then
      v_new := v_new + 1;
    elsif inventory_private.product_matches_json(v_existing, v_product) then
      v_unchanged := v_unchanged + 1;
    else
      v_updated := v_updated + 1;
    end if;
    v_normalized := v_normalized || jsonb_build_array(jsonb_set(v_product, '{id}', to_jsonb(v_id::text), true));
  end loop;

  if p_mode = 'replace' then
    select count(*) into v_deleted from public.products where not (id = any(v_seen));
  end if;
  v_state := inventory_private.current_product_state_hash();
  v_summary := jsonb_build_object('new',v_new,'update',v_updated,'unchanged',v_unchanged,'delete',v_deleted,'error',0,'conflict',0);
  insert into inventory_private.inventory_json_previews (user_id, kind, mode, payload, payload_hash, state_hash, summary)
  values (v_user, 'import', p_mode, jsonb_set(p_document, '{products}', v_normalized), md5(jsonb_set(p_document, '{products}', v_normalized)::text), v_state, v_summary)
  returning token, expires_at into v_token, v_expires;

  delete from inventory_private.inventory_json_previews where expires_at < now() - interval '1 day';
  return jsonb_build_object('preview_token',v_token,'expires_at',v_expires,'data_version',v_state,'counts',v_summary);
end;
$$;

create function public.commit_inventory_json_import(
  p_preview_token uuid,
  p_idempotency_key uuid,
  p_confirmation_text text default ''
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
  v_product jsonb;
  v_id uuid;
  v_backup uuid;
  v_result jsonb;
  v_affected integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('beauty-inventory-products'));
  select result into v_prior from inventory_private.inventory_import_batches where user_id = v_user and idempotency_key = p_idempotency_key;
  if v_prior is not null then return jsonb_set(v_prior, '{status}', '"already-applied"'); end if;

  select * into v_preview from inventory_private.inventory_json_previews where token = p_preview_token for update;
  if v_preview.token is null or v_preview.user_id <> v_user or v_preview.kind <> 'import' then raise exception 'invalid preview token'; end if;
  if v_preview.consumed_at is not null or v_preview.expires_at <= now() then raise exception 'preview expired or consumed'; end if;
  if v_preview.state_hash <> inventory_private.current_product_state_hash() then raise exception 'inventory changed; preview again'; end if;
  if v_preview.mode = 'replace' and p_confirmation_text <> ('REPLACE ' || (v_preview.summary->>'delete')) then raise exception 'replace confirmation mismatch'; end if;
  v_affected := (v_preview.summary->>'new')::integer + (v_preview.summary->>'update')::integer + (v_preview.summary->>'delete')::integer;
  for v_product in select value from jsonb_array_elements(v_preview.payload->'products') loop
    if v_product#>>'{image,storagePath}' is not null and not exists (
      select 1 from storage.objects where bucket_id='product-images' and name=v_product#>>'{image,storagePath}'
    ) then raise exception 'image disappeared after preview'; end if;
  end loop;
  v_backup := inventory_private.create_product_backup(v_preview.mode, v_affected);

  for v_product in select value from jsonb_array_elements(v_preview.payload->'products') loop
    v_id := (v_product->>'id')::uuid;
    if v_preview.mode = 'add' then
      insert into public.products (id,name,brand_id,category_id,subcategory_id,image_url,expiration_type,expiration_date,opened,opened_date,pao_months,capacity,quantity,notes,created_at,updated_at)
      values (v_id,v_product->>'name',nullif(v_product#>>'{brand,id}','')::uuid,nullif(v_product#>>'{category,id}','')::uuid,nullif(v_product#>>'{subcategory,id}','')::uuid,v_product#>>'{image,storagePath}',(v_product#>>'{expiration,type}')::public.expiration_type,nullif(v_product#>>'{expiration,date}','')::date,(v_product#>>'{legacy,opened}')::boolean,nullif(v_product#>>'{legacy,openedDate}','')::date,(v_product->>'paoMonths')::integer,(v_product->>'capacity')::numeric,(v_product->>'quantity')::integer,v_product->>'notes',coalesce((v_product->>'createdAt')::timestamptz,now()),coalesce((v_product->>'updatedAt')::timestamptz,now()));
    elsif v_preview.mode = 'update' then
      update public.products p set
        name = case when v_product ? 'name' then v_product->>'name' else p.name end,
        brand_id = case when v_product ? 'brand' then nullif(v_product#>>'{brand,id}','')::uuid else p.brand_id end,
        category_id = case when v_product ? 'category' then nullif(v_product#>>'{category,id}','')::uuid else p.category_id end,
        subcategory_id = case when v_product ? 'subcategory' then nullif(v_product#>>'{subcategory,id}','')::uuid else p.subcategory_id end,
        image_url = case when v_product ? 'image' then v_product#>>'{image,storagePath}' else p.image_url end,
        expiration_type = case when v_product ? 'expiration' then (v_product#>>'{expiration,type}')::public.expiration_type else p.expiration_type end,
        expiration_date = case when v_product ? 'expiration' then nullif(v_product#>>'{expiration,date}','')::date else p.expiration_date end,
        opened = case when v_product ? 'legacy' then (v_product#>>'{legacy,opened}')::boolean else p.opened end,
        opened_date = case when v_product ? 'legacy' then nullif(v_product#>>'{legacy,openedDate}','')::date else p.opened_date end,
        pao_months = case when v_product ? 'paoMonths' then (v_product->>'paoMonths')::integer else p.pao_months end,
        capacity = case when v_product ? 'capacity' then (v_product->>'capacity')::numeric else p.capacity end,
        quantity = case when v_product ? 'quantity' then (v_product->>'quantity')::integer else p.quantity end,
        notes = case when v_product ? 'notes' then v_product->>'notes' else p.notes end
      where p.id = v_id;
    else
      insert into public.products (id,name,brand_id,category_id,subcategory_id,image_url,expiration_type,expiration_date,opened,opened_date,pao_months,capacity,quantity,notes,created_at,updated_at)
      values (v_id,v_product->>'name',nullif(v_product#>>'{brand,id}','')::uuid,nullif(v_product#>>'{category,id}','')::uuid,nullif(v_product#>>'{subcategory,id}','')::uuid,v_product#>>'{image,storagePath}',(v_product#>>'{expiration,type}')::public.expiration_type,nullif(v_product#>>'{expiration,date}','')::date,(v_product#>>'{legacy,opened}')::boolean,nullif(v_product#>>'{legacy,openedDate}','')::date,(v_product->>'paoMonths')::integer,(v_product->>'capacity')::numeric,(v_product->>'quantity')::integer,v_product->>'notes',coalesce((v_product->>'createdAt')::timestamptz,now()),coalesce((v_product->>'updatedAt')::timestamptz,now()))
      on conflict (id) do update set name=excluded.name,brand_id=excluded.brand_id,category_id=excluded.category_id,subcategory_id=excluded.subcategory_id,image_url=excluded.image_url,expiration_type=excluded.expiration_type,expiration_date=excluded.expiration_date,opened=excluded.opened,opened_date=excluded.opened_date,pao_months=excluded.pao_months,capacity=excluded.capacity,quantity=excluded.quantity,notes=excluded.notes;
    end if;
  end loop;
  if v_preview.mode = 'replace' then
    delete from public.products where id not in (select (value->>'id')::uuid from jsonb_array_elements(v_preview.payload->'products'));
  end if;

  v_result := jsonb_build_object('status','applied','operation',v_preview.mode,'created',(v_preview.summary->>'new')::integer,'updated',(v_preview.summary->>'update')::integer,'deleted',(v_preview.summary->>'delete')::integer,'unchanged',(v_preview.summary->>'unchanged')::integer,'backupId',v_backup);
  insert into inventory_private.inventory_import_batches values (v_user,p_idempotency_key,p_preview_token,v_preview.mode,v_result,now());
  update inventory_private.inventory_json_previews set consumed_at=now() where token=p_preview_token;
  perform inventory_private.prune_product_backups();
  return v_result;
end;
$$;

create function public.list_inventory_backups()
returns table (id uuid, created_at timestamptz, operation text, product_count integer, affected_count integer, image_reference_count integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform inventory_private.assert_inventory_user();
  return query select b.id,b.created_at,b.operation,b.product_count,b.affected_count,b.image_reference_count from inventory_private.inventory_backups b order by b.created_at desc,b.id desc;
end;
$$;

create function public.prepare_inventory_backup_restore(p_backup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := inventory_private.assert_inventory_user();
  v_state text := inventory_private.current_product_state_hash();
  v_counts jsonb;
  v_items jsonb;
  v_token uuid;
  v_expires timestamptz;
begin
  if not exists (select 1 from inventory_private.inventory_backups where id=p_backup_id) then raise exception 'backup not found'; end if;
  select jsonb_build_object(
    'new',count(*) filter(where p.id is null),
    'update',count(*) filter(where p.id is not null and (bp.row_data - 'updated_at') <> (inventory_private.product_snapshot(p) - 'updated_at')),
    'unchanged',count(*) filter(where p.id is not null and (bp.row_data - 'updated_at') = (inventory_private.product_snapshot(p) - 'updated_at')),
    'delete',(select count(*) from public.products current where not exists(select 1 from inventory_private.inventory_backup_products x where x.backup_id=p_backup_id and x.product_id=current.id)),
    'conflict',0,'error',0)
  into v_counts
  from inventory_private.inventory_backup_products bp left join public.products p on p.id=bp.product_id
  where bp.backup_id=p_backup_id;

  select coalesce(jsonb_agg(jsonb_build_object('key',kind||'-'||id,'sourceIndex',null,'status',kind,'name',name,'productId',id,'message',null,'suggestedMatches','[]'::jsonb,'canConfirmAsNew',false,'changes','[]'::jsonb)),'[]'::jsonb)
  into v_items from (
    select bp.product_id::text id,bp.row_data->>'name' name,case when p.id is null then 'new' when (bp.row_data-'updated_at')=(inventory_private.product_snapshot(p)-'updated_at') then 'unchanged' else 'update' end kind
    from inventory_private.inventory_backup_products bp left join public.products p on p.id=bp.product_id where bp.backup_id=p_backup_id
    union all
    select p.id::text,p.name,'delete' from public.products p where not exists(select 1 from inventory_private.inventory_backup_products bp where bp.backup_id=p_backup_id and bp.product_id=p.id)
  ) differences;

  insert into inventory_private.inventory_json_previews(user_id,kind,mode,payload,payload_hash,state_hash,summary,backup_id)
  values(v_user,'restore','restore',jsonb_build_object('backupId',p_backup_id),md5(p_backup_id::text),v_state,v_counts,p_backup_id)
  returning token,expires_at into v_token,v_expires;
  return jsonb_build_object(
    'preview',jsonb_build_object('valid',true,'format','beauty-inventory/products','version',1,'mode','replace','errors','[]'::jsonb,'counts',v_counts,'items',v_items),
    'execution',jsonb_build_object('enabled',true,'previewToken',v_token,'expiresAt',v_expires,'reason',null)
  );
end;
$$;

create function public.commit_inventory_backup_restore(p_preview_token uuid,p_idempotency_key uuid,p_confirmation_text text)
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

create function public.inventory_referenced_image_paths()
returns table(path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform inventory_private.assert_inventory_user();
  return query
    select distinct inventory_private.image_object_path(value) from (
      select image_url value from public.products
      union all
      select row_data->>'image_url' from inventory_private.inventory_backup_products
    ) refs
    where inventory_private.image_object_path(value) is not null;
end;
$$;

comment on function inventory_private.assert_inventory_user() is
  'beauty-inventory:phase-3b:assert_inventory_user:v1';
comment on function inventory_private.image_object_path(text) is
  'beauty-inventory:phase-3b:image_object_path:v1';
comment on function inventory_private.product_snapshot(public.products) is
  'beauty-inventory:phase-3b:product_snapshot:v1';
comment on function inventory_private.current_product_state_hash() is
  'beauty-inventory:phase-3b:current_product_state_hash:v1';
comment on function inventory_private.product_matches_json(public.products,jsonb) is
  'beauty-inventory:phase-3b:product_matches_json:v1';
comment on function inventory_private.create_product_backup(text,integer) is
  'beauty-inventory:phase-3b:create_product_backup:v1';
comment on function inventory_private.prune_product_backups() is
  'beauty-inventory:phase-3b:prune_product_backups:v1';
comment on function public.prepare_inventory_json_import(jsonb,text,integer[]) is
  'beauty-inventory:phase-3b:prepare_inventory_json_import:v1';
comment on function public.commit_inventory_json_import(uuid,uuid,text) is
  'beauty-inventory:phase-3b:commit_inventory_json_import:v1';
comment on function public.list_inventory_backups() is
  'beauty-inventory:phase-3b:list_inventory_backups:v1';
comment on function public.prepare_inventory_backup_restore(uuid) is
  'beauty-inventory:phase-3b:prepare_inventory_backup_restore:v1';
comment on function public.commit_inventory_backup_restore(uuid,uuid,text) is
  'beauty-inventory:phase-3b:commit_inventory_backup_restore:v1';
comment on function public.inventory_referenced_image_paths() is
  'beauty-inventory:phase-3b:inventory_referenced_image_paths:v1';

revoke all on function inventory_private.assert_inventory_user() from public,anon,authenticated;
revoke all on function inventory_private.image_object_path(text) from public,anon,authenticated;
revoke all on function inventory_private.product_snapshot(public.products) from public,anon,authenticated;
revoke all on function inventory_private.current_product_state_hash() from public,anon,authenticated;
revoke all on function inventory_private.product_matches_json(public.products,jsonb) from public,anon,authenticated;
revoke all on function inventory_private.create_product_backup(text,integer) from public,anon,authenticated;
revoke all on function inventory_private.prune_product_backups() from public,anon,authenticated;

revoke all on function public.prepare_inventory_json_import(jsonb,text,integer[]) from public,anon,authenticated;
revoke all on function public.commit_inventory_json_import(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.list_inventory_backups() from public,anon,authenticated;
revoke all on function public.prepare_inventory_backup_restore(uuid) from public,anon,authenticated;
revoke all on function public.commit_inventory_backup_restore(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.inventory_referenced_image_paths() from public,anon,authenticated;
grant execute on function public.prepare_inventory_json_import(jsonb,text,integer[]) to authenticated;
grant execute on function public.commit_inventory_json_import(uuid,uuid,text) to authenticated;
grant execute on function public.list_inventory_backups() to authenticated;
grant execute on function public.prepare_inventory_backup_restore(uuid) to authenticated;
grant execute on function public.commit_inventory_backup_restore(uuid,uuid,text) to authenticated;
grant execute on function public.inventory_referenced_image_paths() to authenticated;

do $$
declare
  object_signature text;
  internal_table text;
  current_inventory_fingerprint text;
  current_image_fingerprint text;
begin
  foreach internal_table in array array[
    'inventory_backups',
    'inventory_backup_products',
    'inventory_backup_product_tags',
    'inventory_json_previews',
    'inventory_import_batches'
  ] loop
    if not exists (
      select 1
      from pg_class relation_object
      where relation_object.oid =
        to_regclass('inventory_private.' || internal_table)
        and relation_object.relrowsecurity
        and obj_description(relation_object.oid, 'pg_class') =
          'beauty-inventory:phase-3b:' || internal_table || ':v1'
    ) then
      raise exception 'Phase 3B postcondition failed: internal table % is incomplete',
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
      raise exception 'Phase 3B postcondition failed: function % is incomplete',
        object_signature;
    end if;
  end loop;

  foreach object_signature in array array[
    'public.prepare_inventory_json_import(jsonb,text,integer[])',
    'public.commit_inventory_json_import(uuid,uuid,text)',
    'public.list_inventory_backups()',
    'public.prepare_inventory_backup_restore(uuid)',
    'public.commit_inventory_backup_restore(uuid,uuid,text)',
    'public.inventory_referenced_image_paths()'
  ] loop
    if not has_function_privilege('authenticated', object_signature, 'execute')
       or has_function_privilege('anon', object_signature, 'execute')
       or not exists (
         select 1 from pg_proc function_object
         where function_object.oid = to_regprocedure(object_signature)
           and function_object.prosecdef
       ) then
      raise exception 'Phase 3B postcondition failed: public RPC ACL is incomplete for %',
        object_signature;
    end if;
  end loop;

  foreach object_signature in array array[
    'inventory_private.assert_inventory_user()',
    'inventory_private.image_object_path(text)',
    'inventory_private.product_snapshot(public.products)',
    'inventory_private.current_product_state_hash()',
    'inventory_private.product_matches_json(public.products,jsonb)',
    'inventory_private.create_product_backup(text,integer)',
    'inventory_private.prune_product_backups()'
  ] loop
    if has_function_privilege('authenticated', object_signature, 'execute')
       or has_function_privilege('anon', object_signature, 'execute') then
      raise exception 'Phase 3B postcondition failed: private helper ACL is incomplete for %',
        object_signature;
    end if;
  end loop;

  if exists (select 1 from inventory_private.inventory_backups)
     or exists (select 1 from inventory_private.inventory_backup_products)
     or exists (select 1 from inventory_private.inventory_backup_product_tags)
     or exists (select 1 from inventory_private.inventory_json_previews)
     or exists (select 1 from inventory_private.inventory_import_batches) then
    raise exception 'Phase 3B postcondition failed: installation created runtime records';
  end if;

  select md5(
    coalesce((
      select jsonb_agg(to_jsonb(product_row) order by product_row.id)::text
      from public.products product_row
    ), '[]') ||
    coalesce((
      select jsonb_agg(to_jsonb(product_tag_row)
        order by product_tag_row.product_id, product_tag_row.tag_id)::text
      from public.product_tags product_tag_row
    ), '[]')
  ) into current_inventory_fingerprint;

  select coalesce(md5(string_agg(
    storage_object.name, '|' order by storage_object.name
  )), md5(''))
  into current_image_fingerprint
  from storage.objects storage_object
  where storage_object.bucket_id = 'product-images';

  if current_inventory_fingerprint is distinct from
       current_setting('beauty_inventory.phase3b_inventory_fingerprint', true)
     or current_image_fingerprint is distinct from
       current_setting('beauty_inventory.phase3b_image_fingerprint', true) then
    raise exception 'Phase 3B postcondition failed: inventory or image paths changed during installation';
  end if;
end
$$;

commit;
