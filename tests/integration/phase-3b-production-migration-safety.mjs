import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../..");
const temporaryRoot = mkdtempSync("/tmp/bi-3b-pg-");
const dataDirectory = join(temporaryRoot, "data");
const socketDirectory = join(temporaryRoot, "socket");

function run(command, args, options = {}) {
  const { allowFailure = false, capture = false, ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    ...spawnOptions,
  });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} exited with ${result.status}\n${result.stderr || result.stdout}`);
  }
  return result;
}

function postgresBinary(name) {
  if (process.env.PG_BINDIR) return join(process.env.PG_BINDIR, name);
  return join(run("pg_config", ["--bindir"], { capture: true }).stdout.trim(), name);
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
  if (!address || typeof address === "string") throw new Error("No isolated PostgreSQL port");
  return address.port;
}

const initdb = postgresBinary("initdb");
const pgCtl = postgresBinary("pg_ctl");
const psql = postgresBinary("psql");
const port = await unusedPort();
let clusterStarted = false;

function psqlArgs() {
  return [
    "-h", socketDirectory, "-p", String(port), "-U", "postgres", "-d", "postgres",
    "-v", "ON_ERROR_STOP=1",
  ];
}

function sql(command, allowFailure = false) {
  return run(psql, [...psqlArgs(), "-c", command], { capture: true, allowFailure });
}

function sqlFile(path, allowFailure = false) {
  return run(psql, [...psqlArgs(), "-f", path], { capture: true, allowFailure });
}

function scalar(command) {
  return run(psql, [...psqlArgs(), "-At", "-c", command], { capture: true }).stdout.trim();
}

function assertSql(condition, message) {
  sql(`select test_support.assert_true((${condition}), '${message.replaceAll("'", "''")}');`);
}

try {
  run(initdb, ["-D", dataDirectory, "-A", "trust", "-U", "postgres", "--no-locale", "-E", "UTF8"], { capture: true });
  run("mkdir", ["-p", socketDirectory], { capture: true });
  run(pgCtl, [
    "-D", dataDirectory,
    "-l", join(temporaryRoot, "postgres.log"),
    "-o", `-F -p ${port} -k ${socketDirectory}`,
    "-w", "start",
  ], { capture: true });
  clusterStarted = true;

  const setup = join(testDirectory, "phase-3b-local-setup.sql");
  const core = join(testDirectory, "phase-3b-core.sql");
  const preflight = join(repositoryRoot, "supabase/phase-3b-json-import-backup-preflight.READONLY.sql");
  const production = join(repositoryRoot, "supabase/phase-3b-json-import-backup.PRODUCTION.sql");
  const rollbackReview = join(repositoryRoot, "supabase/phase-3b-json-import-backup-rollback.REVIEW.sql");
  const verification = join(repositoryRoot, "supabase/phase-3b-json-import-backup-post-install.READONLY.sql");
  const committedRollback = join(temporaryRoot, "phase-3b-rollback.sql");
  const rollbackSource = readFileSync(rollbackReview, "utf8");
  const committedSource = rollbackSource.replace(/rollback;\s*$/i, "commit;\n");
  if (committedSource === rollbackSource) throw new Error("Rollback review safe default is missing");
  writeFileSync(committedRollback, committedSource);

  sqlFile(setup);
  sql(`
    insert into public.products (id,name,quantity)
    select md5('phase-3b-preflight-product-' || sequence_number::text)::uuid,
           'Preflight product ' || sequence_number::text,
           sequence_number
    from generate_series(2,28) sequence_number;
    insert into storage.objects (bucket_id,name,metadata)
    select 'product-images',
           'preflight/' || sequence_number::text || '.webp',
           jsonb_build_object('size',sequence_number)
    from generate_series(1,25) sequence_number;
  `);
  const preflightResult = sqlFile(preflight);
  if (preflightResult.stdout.includes("FAIL")) {
    throw new Error(`Uninstalled Phase 3B preflight reported a failure:\n${preflightResult.stdout}`);
  }
  const prematureVerification = sqlFile(verification);
  if (!prematureVerification.stdout.includes("FAIL")) {
    throw new Error("Post-install verification did not report missing Phase 3B objects");
  }
  const initialInventoryFingerprint = scalar(`select md5(
    coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text from public.products p),'[]') ||
    coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id,pt.tag_id)::text from public.product_tags pt),'[]')
  )`);
  const initialImageFingerprint = scalar(`select coalesce(
    (select md5(string_agg(name,'|' order by name)) from storage.objects where bucket_id='product-images'),
    md5('')
  )`);

  console.log("RUN Phase 3B collision guard");
  sql("create function public.list_inventory_backups() returns integer language sql as 'select 777'; comment on function public.list_inventory_backups() is 'other-site-owned';");
  const collision = sqlFile(production, true);
  if (collision.status === 0) throw new Error("Production forward replaced a same-signature function");
  assertSql("public.list_inventory_backups()=777", "foreign function body unchanged");
  assertSql("obj_description(to_regprocedure('public.list_inventory_backups()'),'pg_proc')='other-site-owned'", "foreign function marker unchanged");
  sql("drop function public.list_inventory_backups()");
  console.log("PASS Phase 3B collision guard");

  console.log("RUN Phase 3B production install and core RPC checks");
  sqlFile(production);
  assertSql("(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='inventory_private' and c.relname like 'inventory_%' and c.relkind='r' and c.relrowsecurity)=5", "five Phase 3B tables use RLS");
  assertSql("(select count(*) from pg_proc where obj_description(oid,'pg_proc') like 'beauty-inventory:phase-3b:%:v1')=13", "thirteen Phase 3B functions marked");
  assertSql(`'${initialInventoryFingerprint}'=(select md5(
    coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text from public.products p),'[]') ||
    coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id,pt.tag_id)::text from public.product_tags pt),'[]')
  ))`, "install preserved product state");
  assertSql(`'${initialImageFingerprint}'=(select coalesce(
    (select md5(string_agg(name,'|' order by name)) from storage.objects where bucket_id='product-images'),
    md5('')
  ))`, "install preserved image paths");
  assertSql("(select payload from other_site.records where id=1)='must remain unchanged'", "install preserved other-site data");
  const verificationResult = sqlFile(verification);
  if (verificationResult.stdout.includes("FAIL")) {
    throw new Error(`Installed Phase 3B verification reported a failure:\n${verificationResult.stdout}`);
  }
  sql(`
    delete from public.products where name like 'Preflight product %';
    delete from storage.objects where bucket_id='product-images' and name like 'preflight/%';
  `);
  sqlFile(core);
  console.log("PASS Phase 3B production install and core RPC checks");

  const postCoreFingerprint = scalar(`select md5(
    coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text from public.products p),'[]') ||
    coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id,pt.tag_id)::text from public.product_tags pt),'[]')
  )`);
  const backupCount = Number(scalar("select count(*) from inventory_private.inventory_backups"));
  if (backupCount < 1) throw new Error("Core checks did not create Phase 3B snapshots");

  console.log("RUN Phase 3B guarded rollback and reinstall");
  sqlFile(rollbackReview);
  assertSql("to_regprocedure('public.commit_inventory_json_import(uuid,uuid,text)') is not null", "safe-default rollback retained RPCs");
  assertSql(`(select count(*) from inventory_private.inventory_backups)=${backupCount}`, "safe-default rollback retained snapshots");
  sqlFile(committedRollback);
  assertSql("to_regprocedure('public.commit_inventory_json_import(uuid,uuid,text)') is null", "authorized rollback removed RPCs");
  assertSql(`'${postCoreFingerprint}'=md5(
    coalesce((select jsonb_agg(to_jsonb(p) order by p.id)::text from public.products p),'[]') ||
    coalesce((select jsonb_agg(to_jsonb(pt) order by pt.product_id,pt.tag_id)::text from public.product_tags pt),'[]')
  )`, "rollback preserved product state");
  assertSql("(select payload from other_site.records where id=1)='must remain unchanged'", "rollback preserved other-site data");
  sqlFile(production);
  console.log("PASS Phase 3B guarded rollback and reinstall");
} finally {
  if (clusterStarted) {
    run(pgCtl, ["-D", dataDirectory, "-m", "fast", "-w", "stop"], {
      capture: true,
      allowFailure: true,
    });
  }
  rmSync(temporaryRoot, { recursive: true, force: true });
}
