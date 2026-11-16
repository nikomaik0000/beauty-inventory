import type { ExpirationType, ProductWithRelations } from "./types";

export const PRODUCT_JSON_FORMAT = "beauty-inventory/products";
export const PRODUCT_JSON_VERSION = 1;

export type JsonImportMode = "add" | "update" | "replace";
export type JsonPreviewStatus = "new" | "update" | "unchanged" | "delete" | "conflict";

interface JsonRelation {
  id: string;
  name: string;
}

export interface ProductJsonRecord {
  id: string | null;
  name: string;
  brand: JsonRelation | null;
  category: JsonRelation | null;
  subcategory: JsonRelation | null;
  capacity: number | null;
  quantity: number;
  expiration: { type: ExpirationType; date: string | null };
  paoMonths: number | null;
  notes: string | null;
  image: { storagePath: string | null };
  legacy: { opened: boolean; openedDate: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface ProductJsonDocument {
  format: typeof PRODUCT_JSON_FORMAT;
  version: typeof PRODUCT_JSON_VERSION;
  exportedAt: string;
  products: ProductJsonRecord[];
}

export interface JsonFieldDiff {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface JsonPreviewItem {
  key: string;
  status: JsonPreviewStatus;
  name: string;
  productId: string | null;
  message: string | null;
  suggestedMatches: string[];
  changes: JsonFieldDiff[];
}

export interface JsonPreviewResult {
  valid: boolean;
  format: string | null;
  version: number | null;
  mode: JsonImportMode;
  errors: string[];
  counts: Record<JsonPreviewStatus | "error", number>;
  items: JsonPreviewItem[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IMAGE_PATH_MARKERS = [
  "/storage/v1/object/public/product-images/",
  "/storage/v1/object/sign/product-images/",
  "/storage/v1/object/authenticated/product-images/",
];

function safeImageStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  let candidate = value;
  if (value.includes("://")) {
    try {
      const pathname = new URL(value).pathname;
      const marker = IMAGE_PATH_MARKERS.find((item) => pathname.includes(item));
      if (!marker) return null;
      candidate = pathname.slice(pathname.indexOf(marker) + marker.length);
    } catch {
      return null;
    }
  }
  try {
    const path = decodeURIComponent(candidate).replace(/^\/+/, "");
    if (!path || path.includes("\\") || path.includes("\0") || path.includes("?") || path.includes("#") || path.split("/").some((part) => !part || part === "." || part === "..")) return null;
    return path;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isIsoDateTime(value: string): boolean {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

function optionalString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function relation(value: unknown, path: string, errors: string[]): JsonRelation | null {
  if (value === null) return null;
  if (!isObject(value) || typeof value.id !== "string" || !UUID_RE.test(value.id) || typeof value.name !== "string" || !value.name.trim()) {
    errors.push(`${path} 必須為 null，或包含有效 UUID 與名稱。`);
    return null;
  }
  return { id: value.id, name: value.name.trim() };
}

function parseRecord(value: unknown, index: number, errors: string[]): ProductJsonRecord | null {
  const path = `products[${index}]`;
  if (!isObject(value)) {
    errors.push(`${path} 必須是物件。`);
    return null;
  }

  const id = value.id == null ? null : value.id;
  if (id !== null && (typeof id !== "string" || !UUID_RE.test(id))) errors.push(`${path}.id 必須是有效 UUID 或 null。`);
  if (typeof value.name !== "string" || !value.name.trim()) errors.push(`${path}.name 不可空白。`);
  if (value.capacity !== null && (typeof value.capacity !== "number" || !Number.isFinite(value.capacity) || value.capacity < 0)) {
    errors.push(`${path}.capacity 必須是大於等於 0 的數字或 null。`);
  }
  if (typeof value.quantity !== "number" || !Number.isInteger(value.quantity) || value.quantity < 0) {
    errors.push(`${path}.quantity 必須是大於等於 0 的整數。`);
  }
  if (value.paoMonths !== null && (typeof value.paoMonths !== "number" || !Number.isInteger(value.paoMonths) || value.paoMonths < 0)) {
    errors.push(`${path}.paoMonths 必須是大於等於 0 的整數或 null。`);
  }
  if (!optionalString(value.notes)) errors.push(`${path}.notes 必須是字串或 null。`);
  if (typeof value.createdAt !== "string" || !isIsoDateTime(value.createdAt)) errors.push(`${path}.createdAt 必須是 ISO 日期時間。`);
  if (typeof value.updatedAt !== "string" || !isIsoDateTime(value.updatedAt)) errors.push(`${path}.updatedAt 必須是 ISO 日期時間。`);

  const expiration = value.expiration;
  let expirationType: ExpirationType = "unknown";
  let expirationDate: string | null = null;
  if (!isObject(expiration) || !["dated", "none", "unknown"].includes(String(expiration.type))) {
    errors.push(`${path}.expiration.type 無效。`);
  } else {
    expirationType = expiration.type as ExpirationType;
    if (!optionalString(expiration.date)) errors.push(`${path}.expiration.date 必須是日期字串或 null。`);
    else expirationDate = expiration.date;
    if (expirationType === "dated" && (typeof expirationDate !== "string" || !isIsoDate(expirationDate))) {
      errors.push(`${path}.expiration.date 在 dated 模式必須為 YYYY-MM-DD。`);
    }
    if (expirationType !== "dated" && expirationDate !== null) errors.push(`${path}.expiration.date 在非 dated 模式必須為 null。`);
  }

  const image = value.image;
  let storagePath: string | null = null;
  if (!isObject(image) || !optionalString(image.storagePath)) {
    errors.push(`${path}.image.storagePath 必須是 Storage object path 或 null。`);
  } else if (image.storagePath !== null) {
    storagePath = safeImageStoragePath(image.storagePath);
    if (!storagePath || storagePath !== image.storagePath || image.storagePath.includes("://")) {
      errors.push(`${path}.image.storagePath 不是有效的 object path，不可使用 URL。`);
    }
  }

  const legacy = value.legacy;
  let opened = false;
  let openedDate: string | null = null;
  if (!isObject(legacy) || typeof legacy.opened !== "boolean" || !optionalString(legacy.openedDate)) {
    errors.push(`${path}.legacy 必須包含 opened 與 openedDate。`);
  } else {
    opened = legacy.opened;
    openedDate = legacy.openedDate;
    if (openedDate !== null && !isIsoDate(openedDate)) errors.push(`${path}.legacy.openedDate 必須為 YYYY-MM-DD 或 null。`);
  }

  const before = errors.length;
  const brand = relation(value.brand, `${path}.brand`, errors);
  const category = relation(value.category, `${path}.category`, errors);
  const subcategory = relation(value.subcategory, `${path}.subcategory`, errors);
  if (errors.length > before || typeof value.name !== "string") return null;

  return {
    id: typeof id === "string" ? id : null,
    name: value.name.trim(),
    brand,
    category,
    subcategory,
    capacity: typeof value.capacity === "number" ? value.capacity : null,
    quantity: typeof value.quantity === "number" ? value.quantity : 0,
    expiration: { type: expirationType, date: expirationDate },
    paoMonths: typeof value.paoMonths === "number" ? value.paoMonths : null,
    notes: typeof value.notes === "string" ? value.notes : null,
    image: { storagePath },
    legacy: { opened, openedDate },
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
}

export function productToJsonRecord(product: ProductWithRelations): ProductJsonRecord {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand ? { id: product.brand.id, name: product.brand.name } : null,
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
    subcategory: product.subcategory ? { id: product.subcategory.id, name: product.subcategory.name } : null,
    capacity: product.capacity,
    quantity: product.quantity,
    expiration: { type: product.expiration_type, date: product.expiration_date },
    paoMonths: product.pao_months,
    notes: product.notes,
    image: { storagePath: safeImageStoragePath(product.image_url) },
    legacy: { opened: product.opened, openedDate: product.opened_date },
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

export function buildProductJsonDocument(products: ProductWithRelations[], exportedAt = new Date().toISOString()): ProductJsonDocument {
  return {
    format: PRODUCT_JSON_FORMAT,
    version: PRODUCT_JSON_VERSION,
    exportedAt,
    products: products.map(productToJsonRecord),
  };
}

function display(value: unknown): string {
  if (value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function compareRecord(input: ProductJsonRecord, existing: ProductWithRelations): JsonFieldDiff[] {
  const current = productToJsonRecord(existing);
  const fields: Array<[string, string, unknown, unknown]> = [
    ["name", "商品名稱", current.name, input.name],
    ["brand", "品牌", current.brand?.name ?? null, input.brand?.name ?? null],
    ["category", "大分類", current.category?.name ?? null, input.category?.name ?? null],
    ["subcategory", "小分類", current.subcategory?.name ?? null, input.subcategory?.name ?? null],
    ["capacity", "容量", current.capacity, input.capacity],
    ["quantity", "庫存", current.quantity, input.quantity],
    ["expirationType", "效期類型", current.expiration.type, input.expiration.type],
    ["expirationDate", "效期日期", current.expiration.date, input.expiration.date],
    ["paoMonths", "開封後期限", current.paoMonths, input.paoMonths],
    ["notes", "備註", current.notes, input.notes],
    ["imagePath", "圖片路徑", current.image.storagePath, input.image.storagePath],
    ["opened", "舊開封狀態", current.legacy.opened, input.legacy.opened],
    ["openedDate", "舊開封日期", current.legacy.openedDate, input.legacy.openedDate],
  ];
  return fields
    .filter(([, , before, after]) => before !== after)
    .map(([field, label, before, after]) => ({ field, label, before: display(before), after: display(after) }));
}

function normalized(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function suggestions(input: ProductJsonRecord, existing: ProductWithRelations[]): string[] {
  const name = normalized(input.name);
  if (!name) return [];
  return existing
    .filter((product) => {
      const candidate = normalized(product.name);
      return candidate === name || (Math.min(candidate.length, name.length) >= 4 && (candidate.includes(name) || name.includes(candidate)));
    })
    .slice(0, 3)
    .map((product) => `${product.name}${product.brand?.name ? `（${product.brand.name}）` : ""}`);
}

function emptyCounts(): JsonPreviewResult["counts"] {
  return { new: 0, update: 0, unchanged: 0, delete: 0, conflict: 0, error: 0 };
}

export function previewProductJson(rawText: string, mode: JsonImportMode, existingProducts: ProductWithRelations[]): JsonPreviewResult {
  const counts = emptyCounts();
  const errors: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return { valid: false, format: null, version: null, mode, errors: ["JSON 語法無效。"], counts: { ...counts, error: 1 }, items: [] };
  }
  if (!isObject(raw)) errors.push("JSON 根節點必須是物件。");
  const format = isObject(raw) && typeof raw.format === "string" ? raw.format : null;
  const version = isObject(raw) && typeof raw.version === "number" ? raw.version : null;
  if (format !== PRODUCT_JSON_FORMAT) errors.push(`format 必須是「${PRODUCT_JSON_FORMAT}」。`);
  if (version !== PRODUCT_JSON_VERSION) errors.push(`不支援的 JSON 版本：${String(version ?? "未提供")}。`);
  if (!isObject(raw) || typeof raw.exportedAt !== "string" || !isIsoDateTime(raw.exportedAt)) errors.push("exportedAt 必須是 ISO 日期時間。");
  if (!isObject(raw) || !Array.isArray(raw.products)) errors.push("products 必須是陣列。");

  const records: ProductJsonRecord[] = [];
  const seenIds = new Set<string>();
  if (isObject(raw) && Array.isArray(raw.products)) {
    raw.products.forEach((value, index) => {
      const before = errors.length;
      const record = parseRecord(value, index, errors);
      if (!record || errors.length > before) return;
      if (record.id && seenIds.has(record.id)) {
        errors.push(`products[${index}].id 與本次匯入中的其他商品重複。`);
        return;
      }
      if (record.id) seenIds.add(record.id);
      records.push(record);
    });
  }
  if (errors.length > 0) {
    counts.error = errors.length;
    return { valid: false, format, version, mode, errors, counts, items: [] };
  }

  const existingById = new Map(existingProducts.map((product) => [product.id, product]));
  const representedIds = new Set<string>();
  const items: JsonPreviewItem[] = [];
  records.forEach((record, index) => {
    const existing = record.id ? existingById.get(record.id) : undefined;
    const suggestedMatches = suggestions(record, existingProducts).filter((name) => name !== `${existing?.name}${existing?.brand?.name ? `（${existing.brand.name}）` : ""}`);
    let status: JsonPreviewStatus;
    let message: string | null = null;
    let changes: JsonFieldDiff[] = [];

    if (!record.id) {
      status = "conflict";
      message = "缺少商品 UUID，需人工確認匹配，不會自動覆蓋。";
    } else if (existing) {
      representedIds.add(existing.id);
      changes = compareRecord(record, existing);
      if (mode === "add") {
        status = "conflict";
        message = "此 UUID 已存在；新增模式不會覆蓋現有商品。";
      } else {
        status = changes.length > 0 ? "update" : "unchanged";
      }
    } else if (mode === "update") {
      status = "conflict";
      message = "找不到此 UUID；更新模式不會以名稱自動匹配。";
    } else if (suggestedMatches.length > 0) {
      status = "conflict";
      message = "UUID 不存在，但找到名稱相似的商品，需人工確認。";
    } else {
      status = "new";
    }
    counts[status] += 1;
    items.push({ key: record.id ?? `missing-${index}`, status, name: record.name, productId: record.id, message, suggestedMatches, changes });
  });

  if (mode === "replace") {
    existingProducts.forEach((product) => {
      if (representedIds.has(product.id)) return;
      counts.delete += 1;
      items.push({
        key: `delete-${product.id}`,
        status: "delete",
        name: product.name,
        productId: product.id,
        message: "取代模式將移除此商品；分類與品牌本身不會被刪除。",
        suggestedMatches: [],
        changes: [],
      });
    });
  }

  return { valid: true, format, version, mode, errors: [], counts, items };
}

export function buildExampleProductJson(): ProductJsonDocument {
  return {
    format: PRODUCT_JSON_FORMAT,
    version: PRODUCT_JSON_VERSION,
    exportedAt: new Date(0).toISOString(),
    products: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "範例商品",
        brand: null,
        category: null,
        subcategory: null,
        capacity: 30,
        quantity: 1,
        expiration: { type: "dated", date: "2028-12-31" },
        paoMonths: 12,
        notes: "此檔案只示範格式，不包含圖片實體檔案。",
        image: { storagePath: null },
        legacy: { opened: false, openedDate: null },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}
