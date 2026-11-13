# Phase 1B backup and restore

## What the local backup contains

`node scripts/phase-1b-backup.mjs` creates a user-only directory under
`.local-backups/` containing:

- JSON snapshots of categories, subcategories, brands, tags, products, and product_tags;
- every object currently listed in the `product-images` bucket;
- SHA-256, byte size, MIME type, object path, and related product UUIDs;
- live-count and relationship verification results;
- repository SQL files as reference only.

The directory and files are mode `0700` / `0600` and `.local-backups/` is
Git-ignored. The tool reads only the public URL and anon key. It never reads or
uses the service-role key and performs no database or Storage writes.

## Missing database-native metadata

The local anon snapshot is not a `pg_dump`. It cannot capture authoritative
live policies, constraints, functions, triggers, grants, or database-wide
restore information. Run `supabase/phase-1b-metadata-readonly.sql` manually in
the Supabase SQL Editor. It returns exactly one row and one JSONB column named
`phase_1b_metadata` so the complete snapshot can be saved as one CSV export.

### Save the production metadata snapshot

1. Open the production project in **Supabase Dashboard > SQL Editor > New query**.
2. Copy the entire contents of `supabase/phase-1b-metadata-readonly.sql`, from
   the opening comments / `with` through the final semicolon.
3. Select **Run**. The expected result is one row with one column named
   `phase_1b_metadata`; the statement does not change database state.
4. Use the result grid's CSV download/export action. Save the file as
   `phase-1b-metadata-before-security-switch.csv` beside the Phase 1B backup,
   under a `live-metadata/` directory.
5. Keep the file local with user-only permissions and out of Git. Policy and
   function definitions can reveal internal role names, fixed identifiers, or
   hard-coded literals. The query does not inspect Auth users, passwords, tokens,
   API keys, or Vault secrets, and it returns counts rather than product rows.

Before a security cutover, use this snapshot as the authoritative baseline for
RLS flags, policy definitions, bucket configuration, constraints, triggers,
related functions, and grants. After the cutover, rerun the same query and diff
the two exports. Row counts must remain unchanged; only explicitly reviewed
security metadata should differ. Build rollback SQL from the saved definitions
and exact object names, review it separately, and test it in an isolated project
before using it in production.

For a database-native recovery artifact, first inspect **Database > Backups**
in the Supabase Dashboard. Paid projects normally have managed daily backups;
physical/PITR backups may be restorable from the Dashboard without being
directly downloadable. A portable logical backup requires the Supabase CLI
`db dump` commands or `pg_dump` with an appropriate database connection.
Keep credentials outside the repository and do not paste them into chat.
Recommended artifacts are:

1. a full custom-format database dump for restore;
2. a schema-only SQL dump for human review;
3. a data-only dump of the six inventory tables;
4. the metadata query results and the Storage object backup.

The Supabase-documented logical dump set is:

```sh
supabase db dump --remote="$READ_ONLY_DB_URL" -f roles.sql --role-only
supabase db dump --remote="$READ_ONLY_DB_URL" -f schema.sql
supabase db dump --remote="$READ_ONLY_DB_URL" -f data.sql --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Do not place the connection string in this repository or shell history. These
commands are intentionally documentation only and are not run by Phase 1B.

## Verification

The tool fails rather than finalizing the directory when:

- a table's downloaded row count differs from its live exact count;
- the Storage object path set changes during the backup;
- a referenced image is missing;
- a downloaded file or JSON hash cannot be reproduced.

`verification.json` records aggregate checks without printing product content.

## Restore order

Do not restore directly into production first.

1. Create an isolated Supabase/PostgreSQL test project.
2. Restore the database-native dump or recreate the reviewed schema.
3. Restore categories, subcategories, brands, tags, products, then product_tags.
4. Upload Storage objects to the exact paths in `storage-manifest.json`.
5. Apply the saved pre-change RLS and Storage policies.
6. Compare table counts, foreign-key checks, image hashes, and opened-data counts.
7. Test the application against the isolated environment.
8. Only use the same sequence in production after the isolated restore passes.

The JSON snapshot is sufficient for controlled application-level recovery, but
it is not a substitute for a verified database-native dump when exact DDL,
policies, grants, and trigger behavior must be restored.

