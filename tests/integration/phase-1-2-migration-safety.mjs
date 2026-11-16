import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../..");
// Keep the Unix socket path comfortably below PostgreSQL's platform limit.
const temporaryRoot = mkdtempSync("/tmp/bi-pg-");
const dataDirectory = join(temporaryRoot, "data");
const socketDirectory = join(temporaryRoot, "socket");

function run(command, commandArguments, options = {}) {
  const { allowFailure = false, capture = false, ...spawnOptions } = options;
  const result = spawnSync(command, commandArguments, {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    ...spawnOptions,
  });

  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    const detail = capture ? `\n${result.stderr || result.stdout}` : "";
    throw new Error(`${command} exited with status ${result.status}${detail}`);
  }
  return result;
}

function postgresBinary(name) {
  const configured = process.env.PG_BINDIR;
  if (configured) return join(configured, name);

  const result = run("pg_config", ["--bindir"], { capture: true });
  return join(result.stdout.trim(), name);
}

function committedDraft(sourcePath, outputName) {
  const source = readFileSync(sourcePath, "utf8");
  const committed = source.replace(/rollback;\s*$/i, "commit;\n");
  if (committed === source) {
    throw new Error(`Safe-default ROLLBACK not found in ${sourcePath}`);
  }
  const outputPath = join(temporaryRoot, outputName);
  writeFileSync(outputPath, committed);
  return outputPath;
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  if (!port) throw new Error("Could not allocate an isolated PostgreSQL port");
  return port;
}

const initdb = postgresBinary("initdb");
const pgCtl = postgresBinary("pg_ctl");
const psql = postgresBinary("psql");
const port = await unusedPort();
let clusterStarted = false;

function psqlArguments() {
  return ["-h", socketDirectory, "-p", String(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
}

function sql(command) {
  return run(psql, [...psqlArguments(), "-c", command], { capture: true });
}

function scalar(command) {
  return run(psql, [...psqlArguments(), "-At", "-c", command], { capture: true }).stdout.trim();
}

function sqlFile(path, allowFailure = false) {
  return run(psql, [...psqlArguments(), "-f", path], { capture: true, allowFailure });
}

function assertSql(condition, message) {
  sql(`select test_support.assert_true((${condition}), ${quoteLiteral(message)});`);
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
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

  const setup = join(testDirectory, "phase-1-2-migration-safety-setup.sql");
  const phase1ForwardDraft = join(repositoryRoot, "supabase/phase-1-security-forward.DRAFT.sql");
  const phase1RollbackDraft = join(repositoryRoot, "supabase/phase-1-security-rollback.DRAFT.sql");
  const phase2ForwardDraft = join(repositoryRoot, "supabase/phase-2-atomic-inventory.DRAFT.sql");
  const phase2RollbackDraft = join(repositoryRoot, "supabase/phase-2-atomic-inventory-rollback.DRAFT.sql");
  const phase1Forward = committedDraft(phase1ForwardDraft, "phase-1-forward.sql");
  const phase1Rollback = committedDraft(phase1RollbackDraft, "phase-1-rollback.sql");
  const phase2Forward = committedDraft(phase2ForwardDraft, "phase-2-forward.sql");
  const phase2Rollback = committedDraft(phase2RollbackDraft, "phase-2-rollback.sql");

  sqlFile(setup);
  const sharedPolicyOid = scalar(`
    select policy_object.oid
    from pg_policy policy_object
    join pg_class relation_object on relation_object.oid = policy_object.polrelid
    join pg_namespace schema_object on schema_object.oid = relation_object.relnamespace
    where schema_object.nspname = 'storage'
      and relation_object.relname = 'objects'
      and policy_object.polname = 'shared site read images'
  `);

  console.log("RUN Phase 1 forward and rollback");
  sqlFile(phase1ForwardDraft);
  assertSql("to_regnamespace('inventory_private') is null", "Phase 1 forward draft keeps its safe-default rollback");
  assertSql("(select public from storage.buckets where id='product-images')", "Phase 1 forward draft left the product bucket public");
  sqlFile(phase1Forward);
  assertSql("(select count(*) from pg_policies where schemaname='storage' and tablename='objects') = 5", "Phase 1 forward retained the unrelated Storage policy");
  assertSql("exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='shared site read images')", "unrelated Storage policy exists after Phase 1 forward");
  assertSql(`(select policy_object.oid::text from pg_policy policy_object where policy_object.polname='shared site read images') = ${quoteLiteral(sharedPolicyOid)}`, "unrelated Storage policy was not recreated or replaced by Phase 1 forward");
  assertSql("(select public from storage.buckets where id='shared-site-images')", "unrelated Storage bucket unchanged after Phase 1 forward");
  assertSql("(select payload from other_site.records where id=1) = 'must remain unchanged'", "other-site data unchanged after Phase 1 forward");

  sqlFile(phase1RollbackDraft);
  assertSql("to_regnamespace('inventory_private') is not null", "Phase 1 rollback draft keeps its safe-default rollback");
  assertSql("not (select public from storage.buckets where id='product-images')", "Phase 1 rollback draft left the product bucket private");
  sqlFile(phase1Rollback);
  assertSql("(select count(*) from pg_policies where schemaname='storage' and tablename='objects') = 5", "Phase 1 rollback retained the unrelated Storage policy");
  assertSql("exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='shared site read images')", "unrelated Storage policy exists after Phase 1 rollback");
  assertSql(`(select policy_object.oid::text from pg_policy policy_object where policy_object.polname='shared site read images') = ${quoteLiteral(sharedPolicyOid)}`, "unrelated Storage policy was not recreated or replaced by Phase 1 rollback");
  assertSql("(select public from storage.buckets where id='shared-site-images')", "unrelated Storage bucket unchanged after Phase 1 rollback");
  assertSql("(select payload from other_site.records where id=1) = 'must remain unchanged'", "other-site data unchanged after Phase 1 rollback");
  console.log("PASS Phase 1 named Storage policies preserve shared resources");

  console.log("RUN Phase 2 collision guards");
  sqlFile(phase2ForwardDraft);
  assertSql("to_regprocedure('public.adjust_product_quantity(uuid,integer)') is null", "Phase 2 forward draft keeps its safe-default rollback");
  assertSql("not exists(select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_quantity_nonnegative')", "Phase 2 forward draft left no constraint");
  sql(`
    alter table public.products add constraint products_quantity_nonnegative check (quantity < 1000);
    comment on constraint products_quantity_nonnegative on public.products is 'other-site-owned';
    create function public.adjust_product_quantity(uuid, integer) returns integer language sql as 'select 777';
    comment on function public.adjust_product_quantity(uuid, integer) is 'other-site-owned';
  `);
  const collisionResult = sqlFile(phase2Forward, true);
  if (collisionResult.status === 0) throw new Error("Phase 2 forward unexpectedly replaced existing objects");
  assertSql("public.adjust_product_quantity(gen_random_uuid(), 1) = 777", "foreign same-signature function was not replaced");
  assertSql("obj_description(to_regprocedure('public.adjust_product_quantity(uuid,integer)'), 'pg_proc') = 'other-site-owned'", "foreign function ownership marker unchanged");
  assertSql("exists(select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_quantity_nonnegative' and obj_description(oid, 'pg_constraint')='other-site-owned')", "foreign constraint was not replaced");
  sql(`
    drop function public.adjust_product_quantity(uuid, integer);
    alter table public.products drop constraint products_quantity_nonnegative;
  `);
  console.log("PASS Phase 2 forward fails closed on same-named objects");

  console.log("RUN Phase 2 forward, rollback guard, rollback, and reinstall");
  sqlFile(phase2Forward);
  assertSql("public.adjust_product_quantity('40000000-0000-4000-8000-000000000001', 1) = 6", "Phase 2 atomic update works before rollback");

  sqlFile(phase2RollbackDraft);
  assertSql("to_regprocedure('public.adjust_product_quantity(uuid,integer)') is not null", "Phase 2 rollback draft keeps its safe-default rollback");
  assertSql("(select quantity from public.products where id='40000000-0000-4000-8000-000000000001') = 6", "safe-default rollback did not alter inventory data");

  sql("comment on function public.adjust_product_quantity(uuid, integer) is 'ownership-marker-tampered';");
  const guardedRollback = sqlFile(phase2Rollback, true);
  if (guardedRollback.status === 0) throw new Error("Phase 2 rollback ignored a changed ownership marker");
  assertSql("to_regprocedure('public.adjust_product_quantity(uuid,integer)') is not null", "guarded rollback retained the function");
  assertSql("exists(select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_quantity_nonnegative')", "guarded rollback retained the constraint");
  sql("comment on function public.adjust_product_quantity(uuid, integer) is 'beauty-inventory:phase-2:adjust_product_quantity:v1';");

  sqlFile(phase2Rollback);
  assertSql("to_regprocedure('public.adjust_product_quantity(uuid,integer)') is null", "Phase 2 rollback removed its function");
  assertSql("not exists(select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_quantity_nonnegative')", "Phase 2 rollback removed its constraint");
  assertSql("(select quantity from public.products where id='40000000-0000-4000-8000-000000000001') = 6", "Phase 2 rollback preserved successful inventory changes");

  sqlFile(phase2Forward);
  assertSql("to_regprocedure('public.adjust_product_quantity(uuid,integer)') is not null", "Phase 2 reinstall restored the function");
  assertSql("exists(select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_quantity_nonnegative')", "Phase 2 reinstall restored the constraint");
  assertSql("(select quantity from public.products where id='40000000-0000-4000-8000-000000000001') = 6", "Phase 2 reinstall did not rewrite inventory data");
  console.log("PASS Phase 2 forward, guarded rollback, rollback, and reinstall");
} finally {
  if (clusterStarted) {
    run(pgCtl, ["-D", dataDirectory, "-m", "fast", "-w", "stop"], { capture: true, allowFailure: true });
  }
  rmSync(temporaryRoot, { recursive: true, force: true });
}
