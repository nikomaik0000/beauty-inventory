import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const TABLES = [
  { name: "categories", order: "id.asc" },
  { name: "subcategories", order: "id.asc" },
  { name: "brands", order: "id.asc" },
  { name: "tags", order: "id.asc" },
  { name: "products", order: "id.asc" },
  { name: "product_tags", order: "product_id.asc,tag_id.asc" },
];
const BUCKET = "product-images";
const PAGE_SIZE = 1000;

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index),
          line.slice(index + 1).replace(/^[\s"']+|[\s"']+$/g, ""),
        ];
      }),
  );
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function writePrivateFile(filename, data) {
  await writeFile(filename, data, { mode: 0o600 });
  await chmod(filename, 0o600);
}

async function fetchJson(url, options, label) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}`);
  return response.json();
}

async function fetchTable(baseUrl, headers, table, order) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = new URLSearchParams({
      select: "*",
      order,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const page = await fetchJson(
      `${baseUrl}/rest/v1/${table}?${query}`,
      { headers },
      `Reading ${table}`,
    );
    if (!Array.isArray(page)) throw new Error(`Unexpected ${table} response`);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchExactCount(baseUrl, headers, table) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=0`, {
    method: "HEAD",
    headers: { ...headers, Prefer: "count=exact" },
  });
  if (!response.ok) throw new Error(`Counting ${table} failed with HTTP ${response.status}`);
  const match = response.headers.get("content-range")?.match(/\/(\d+)$/);
  if (!match) throw new Error(`Missing exact count for ${table}`);
  return Number(match[1]);
}

async function listStorageDirectory(baseUrl, headers, prefix = "") {
  const entries = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchJson(
      `${baseUrl}/storage/v1/object/list/${BUCKET}`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" },
        }),
      },
      `Listing Storage prefix ${prefix || "/"}`,
    );
    if (!Array.isArray(page)) throw new Error("Unexpected Storage list response");
    entries.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const files = [];
  for (const entry of entries) {
    const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id && entry.metadata) {
      files.push({
        path: objectPath,
        reportedSize: Number(entry.metadata.size) || null,
        reportedMimeType: entry.metadata.mimetype ?? null,
      });
    } else {
      files.push(...(await listStorageDirectory(baseUrl, headers, objectPath)));
    }
  }
  return files;
}

function encodeObjectPath(objectPath) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function extractImagePath(value) {
  if (!value || typeof value !== "string") return null;
  const marker = `/${BUCKET}/`;
  const index = value.indexOf(marker);
  if (index < 0) return null;
  try {
    return decodeURIComponent(value.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function downloadStorageObject(baseUrl, object, targetRoot) {
  const response = await fetch(
    `${baseUrl}/storage/v1/object/public/${BUCKET}/${encodeObjectPath(object.path)}`,
  );
  if (!response.ok) throw new Error(`Downloading a Storage object failed with HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    path.isAbsolute(object.path) ||
    object.path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Storage returned an unsafe object path");
  }
  const target = path.join(targetRoot, object.path);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  await writePrivateFile(target, bytes);
  return {
    path: object.path,
    size: bytes.length,
    sha256: sha256(bytes),
    contentType: response.headers.get("content-type") ?? object.reportedMimeType,
    reportedSize: object.reportedSize,
  };
}

function relationshipVerification(snapshot, storageEntries) {
  const categories = new Set(snapshot.categories.map((row) => row.id));
  const subcategories = new Set(snapshot.subcategories.map((row) => row.id));
  const brands = new Set(snapshot.brands.map((row) => row.id));
  const products = new Set(snapshot.products.map((row) => row.id));
  const tags = new Set(snapshot.tags.map((row) => row.id));
  const storagePaths = new Set(storageEntries.map((entry) => entry.path));

  const productImageMap = new Map();
  let openedRows = 0;
  let openedDateRows = 0;
  let paoMonthRows = 0;
  let openedWithoutDate = 0;
  let datedWithoutExpiration = 0;
  let brokenProductReferences = 0;

  for (const product of snapshot.products) {
    if (product.brand_id && !brands.has(product.brand_id)) brokenProductReferences += 1;
    if (product.category_id && !categories.has(product.category_id)) brokenProductReferences += 1;
    if (product.subcategory_id && !subcategories.has(product.subcategory_id)) brokenProductReferences += 1;
    if (product.opened) {
      openedRows += 1;
      if (!product.opened_date) openedWithoutDate += 1;
    }
    if (product.opened_date) openedDateRows += 1;
    if (product.pao_months != null) paoMonthRows += 1;
    if (product.expiration_type === "dated" && !product.expiration_date) datedWithoutExpiration += 1;

    const imagePath = extractImagePath(product.image_url);
    if (imagePath) {
      const ids = productImageMap.get(imagePath) ?? [];
      ids.push(product.id);
      productImageMap.set(imagePath, ids);
    }
  }

  let brokenTagReferences = 0;
  for (const link of snapshot.product_tags) {
    if (!products.has(link.product_id) || !tags.has(link.tag_id)) brokenTagReferences += 1;
  }

  const referencedImagePaths = [...productImageMap.keys()];
  const missingReferencedImages = referencedImagePaths.filter((value) => !storagePaths.has(value));

  return {
    brokenProductReferences,
    brokenTagReferences,
    openedRows,
    openedDateRows,
    paoMonthRows,
    openedWithoutDate,
    datedWithoutExpiration,
    referencedImageCount: referencedImagePaths.length,
    missingReferencedImageCount: missingReferencedImages.length,
    unreferencedStorageObjectCount: storageEntries.filter((entry) => !productImageMap.has(entry.path)).length,
    productImageMap,
  };
}

async function main() {
  const projectRoot = process.cwd();
  const env = parseEnv(await readFile(path.join(projectRoot, ".env.local"), "utf8"));
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) throw new Error("Missing public Supabase configuration");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupsRoot = path.join(projectRoot, ".local-backups");
  const finalRoot = path.join(backupsRoot, `phase-1b-${timestamp}`);
  const partialRoot = `${finalRoot}.partial`;
  await mkdir(backupsRoot, { recursive: true, mode: 0o700 });
  await chmod(backupsRoot, 0o700);
  await rm(partialRoot, { recursive: true, force: true });
  await mkdir(partialRoot, { recursive: true, mode: 0o700 });

  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const snapshot = {};
  const databaseManifest = { generatedAt: new Date().toISOString(), tables: {} };

  for (const table of TABLES) {
    const rows = await fetchTable(baseUrl, headers, table.name, table.order);
    snapshot[table.name] = rows;
    const bytes = Buffer.from(`${JSON.stringify(rows, null, 2)}\n`);
    const relativeFile = `database/${table.name}.json`;
    const target = path.join(partialRoot, relativeFile);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writePrivateFile(target, bytes);
    databaseManifest.tables[table.name] = {
      rows: rows.length,
      file: relativeFile,
      sha256: sha256(bytes),
    };
  }

  const objectsBefore = await listStorageDirectory(baseUrl, headers);
  const storageRoot = path.join(partialRoot, "storage", BUCKET);
  const downloaded = [];
  for (const object of objectsBefore) {
    downloaded.push(await downloadStorageObject(baseUrl, object, storageRoot));
  }

  const verification = relationshipVerification(snapshot, downloaded);
  const storageManifest = {
    generatedAt: new Date().toISOString(),
    bucket: BUCKET,
    objects: downloaded.map((entry) => ({
      ...entry,
      productIds: verification.productImageMap.get(entry.path) ?? [],
    })),
  };
  await writePrivateFile(
    path.join(partialRoot, "storage-manifest.json"),
    `${JSON.stringify(storageManifest, null, 2)}\n`,
  );

  const liveCounts = {};
  for (const table of TABLES) liveCounts[table.name] = await fetchExactCount(baseUrl, headers, table.name);
  const objectsAfter = await listStorageDirectory(baseUrl, headers);
  const liveStorage = new Map(objectsAfter.map((entry) => [entry.path, entry.reportedSize]));
  const storageSetMatches =
    liveStorage.size === downloaded.length &&
    downloaded.every((entry) => liveStorage.has(entry.path));
  const tableCountsMatch = TABLES.every(
    (table) => liveCounts[table.name] === databaseManifest.tables[table.name].rows,
  );

  for (const entry of downloaded) {
    const file = await readFile(path.join(storageRoot, entry.path));
    if (file.length !== entry.size || sha256(file) !== entry.sha256) {
      throw new Error("Downloaded image integrity verification failed");
    }
  }
  for (const table of TABLES) {
    const manifest = databaseManifest.tables[table.name];
    const file = await readFile(path.join(partialRoot, manifest.file));
    JSON.parse(file.toString("utf8"));
    if (sha256(file) !== manifest.sha256) throw new Error(`Hash verification failed for ${table.name}`);
  }

  const verificationReport = {
    generatedAt: new Date().toISOString(),
    tableCountsMatch,
    storageObjectSetMatches: storageSetMatches,
    downloadedHashesMatch: true,
    jsonFilesReadable: true,
    liveCounts,
    storageObjectCount: downloaded.length,
    storageBytes: downloaded.reduce((total, entry) => total + entry.size, 0),
    brokenProductReferences: verification.brokenProductReferences,
    brokenTagReferences: verification.brokenTagReferences,
    openedRowsBackedUp: verification.openedRows,
    openedDateRowsBackedUp: verification.openedDateRows,
    paoMonthRowsBackedUp: verification.paoMonthRows,
    openedWithoutDate: verification.openedWithoutDate,
    datedWithoutExpiration: verification.datedWithoutExpiration,
    referencedImageCount: verification.referencedImageCount,
    missingReferencedImageCount: verification.missingReferencedImageCount,
    unreferencedStorageObjectCount: verification.unreferencedStorageObjectCount,
    databaseNativeDumpIncluded: false,
    liveMetadataCatalogIncluded: false,
  };

  await writePrivateFile(
    path.join(partialRoot, "database-manifest.json"),
    `${JSON.stringify(databaseManifest, null, 2)}\n`,
  );
  await writePrivateFile(
    path.join(partialRoot, "verification.json"),
    `${JSON.stringify(verificationReport, null, 2)}\n`,
  );
  await writePrivateFile(
    path.join(partialRoot, "LIMITATIONS.txt"),
    "This is an anon-readable application data and Storage object snapshot.\n" +
      "It is not a pg_dump and does not contain live policies, constraints, functions, triggers, grants, Auth users, or secrets.\n",
  );

  const sqlRoot = path.join(partialRoot, "repository-sql-reference");
  await mkdir(sqlRoot, { recursive: true, mode: 0o700 });
  for (const filename of ["schema.sql", "storage-setup.sql", "phase-2b-migration.sql"]) {
    const source = path.join(projectRoot, "supabase", filename);
    const target = path.join(sqlRoot, filename);
    await copyFile(source, target);
    await chmod(target, 0o600);
  }

  if (!tableCountsMatch || !storageSetMatches || verification.missingReferencedImageCount > 0) {
    throw new Error("Backup verification detected a live count or image mismatch");
  }

  await rename(partialRoot, finalRoot);
  await chmod(finalRoot, 0o700);
  const finalStats = await stat(finalRoot);
  if (!finalStats.isDirectory()) throw new Error("Backup destination is not a directory");

  console.log(
    JSON.stringify(
      {
        backupDirectory: path.relative(projectRoot, finalRoot),
        tableCounts: liveCounts,
        storageObjectCount: verificationReport.storageObjectCount,
        storageBytes: verificationReport.storageBytes,
        tableCountsMatch,
        storageObjectSetMatches: storageSetMatches,
        downloadedHashesMatch: true,
        jsonFilesReadable: true,
        brokenProductReferences: verification.brokenProductReferences,
        brokenTagReferences: verification.brokenTagReferences,
        openedRowsBackedUp: verification.openedRows,
        missingReferencedImageCount: verification.missingReferencedImageCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Backup failed");
  process.exitCode = 1;
});

