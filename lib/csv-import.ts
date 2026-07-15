import { parseCsvText, PRODUCT_CSV_HEADERS, PRODUCT_CSV_VERSION } from "./csv";
import type { Category, ExpirationType, ProductWithRelations } from "./types";

// --- Export ---------------------------------------------------------------

/** Maps a product to its CSV row, in `PRODUCT_CSV_HEADERS` order. Only
 * user-facing fields are exported — no id, image URL, storage path, or
 * timestamps. */
export function productToCsvRow(p: ProductWithRelations): string[] {
  return [
    p.name,
    p.brand?.name ?? "",
    p.category?.name ?? "",
    p.capacity != null ? String(p.capacity) : "",
    String(p.quantity ?? 0),
    expirationToCsvValue(p.expiration_type, p.expiration_date),
    p.opened ? "true" : "false",
    p.notes ?? "",
  ];
}

function expirationToCsvValue(type: ExpirationType, date: string | null): string {
  if (type === "dated" && date) return date;
  if (type === "none") return "none";
  return "";
}

// --- Import -----------------------------------------------------------------

export interface ValidImportRow {
  rowNumber: number;
  name: string;
  brandName: string;
  categoryId: string | null;
  capacity: number | null;
  quantity: number;
  expirationType: ExpirationType;
  expirationDate: string | null;
  opened: boolean;
  notes: string | null;
  /** Set when this row matches an existing product (by 商品 + 品牌). */
  matchedProductId: string | null;
}

export interface InvalidImportRow {
  rowNumber: number;
  reason: string;
}

export interface ParsedImportResult {
  version: number | null;
  valid: ValidImportRow[];
  invalid: InvalidImportRow[];
  skipped: InvalidImportRow[];
  totalRows: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function matchKey(name: string, brand: string): string {
  return `${name.trim().toLowerCase()}::${brand.trim().toLowerCase()}`;
}

/** Parses + validates raw CSV text against the current categories and
 * products (for matching). Pure function — used for the client-side
 * preview and re-run server-side before writing, so both stages agree. */
export function parseAndValidateProductCsv(
  csvText: string,
  categories: Category[],
  existingProducts: ProductWithRelations[],
): ParsedImportResult {
  const rows = parseCsvText(csvText).filter((r) => r.some((cell) => cell.trim() !== ""));

  let version: number | null = null;
  let dataStart = 0;

  if (rows[0]?.[0]?.trim().toLowerCase() === "version") {
    version = Number(rows[0][1]) || null;
    dataStart = 1;
  }
  // Skip the header row if present (matches the known header text).
  if (rows[dataStart] && rows[dataStart][0]?.trim() === PRODUCT_CSV_HEADERS[0]) {
    dataStart += 1;
  }

  const dataRows = rows.slice(dataStart);
  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));
  const productByKey = new Map(
    existingProducts.map((p) => [matchKey(p.name, p.brand?.name ?? ""), p]),
  );

  const valid: ValidImportRow[] = [];
  const invalid: InvalidImportRow[] = [];
  const skipped: InvalidImportRow[] = [];
  const seenKeys = new Set<string>();

  dataRows.forEach((cells, idx) => {
    const rowNumber = idx + 1; // 1-indexed among data rows, shown to the user
    const [name = "", brand = "", category = "", capacityRaw = "", quantityRaw = "", expiration = "", openedRaw = "", notes = ""] = cells;

    if (!name.trim()) {
      invalid.push({ rowNumber, reason: "缺少商品名稱" });
      return;
    }
    if (!brand.trim()) {
      invalid.push({ rowNumber, reason: "缺少品牌" });
      return;
    }

    let categoryId: string | null = null;
    if (category.trim()) {
      const match = categoryByName.get(category.trim().toLowerCase());
      if (!match) {
        invalid.push({ rowNumber, reason: `分類「${category.trim()}」不存在` });
        return;
      }
      categoryId = match.id;
    }

    let capacity: number | null = null;
    if (capacityRaw.trim()) {
      const n = Number(capacityRaw.trim());
      if (Number.isNaN(n)) {
        invalid.push({ rowNumber, reason: "容量不是有效數字" });
        return;
      }
      capacity = n;
    }

    let quantity = 1;
    if (quantityRaw.trim()) {
      const n = Number(quantityRaw.trim());
      if (Number.isNaN(n) || !Number.isInteger(n) || n < 0) {
        invalid.push({ rowNumber, reason: "庫存不是有效數字" });
        return;
      }
      quantity = n;
    }

    let expirationType: ExpirationType = "unknown";
    let expirationDate: string | null = null;
    const expTrimmed = expiration.trim();
    if (expTrimmed && expTrimmed.toLowerCase() !== "none") {
      if (!isValidDate(expTrimmed)) {
        invalid.push({ rowNumber, reason: "效期日期格式無效（需為 YYYY-MM-DD）" });
        return;
      }
      expirationType = "dated";
      expirationDate = expTrimmed;
    } else if (expTrimmed.toLowerCase() === "none") {
      expirationType = "none";
    }

    const opened = openedRaw.trim().toLowerCase() === "true";

    const key = matchKey(name, brand);
    if (seenKeys.has(key)) {
      skipped.push({ rowNumber, reason: "重複列（此商品已於本次匯入中出現過）" });
      return;
    }
    seenKeys.add(key);

    const matched = productByKey.get(key);

    valid.push({
      rowNumber,
      name: name.trim(),
      brandName: brand.trim(),
      categoryId,
      capacity,
      quantity,
      expirationType,
      expirationDate,
      opened,
      notes: notes.trim() || null,
      matchedProductId: matched?.id ?? null,
    });
  });

  return {
    version,
    valid,
    invalid,
    skipped,
    totalRows: dataRows.length,
  };
}

export function countNewVsUpdated(rows: ValidImportRow[]): { newCount: number; updatedCount: number } {
  let newCount = 0;
  let updatedCount = 0;
  for (const r of rows) {
    if (r.matchedProductId) updatedCount += 1;
    else newCount += 1;
  }
  return { newCount, updatedCount };
}

export { PRODUCT_CSV_VERSION };
