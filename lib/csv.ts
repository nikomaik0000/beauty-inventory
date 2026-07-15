/** Minimal RFC4180-style CSV parse/serialize — no external dependency,
 * since the format here is simple (one product per row, no nested
 * CSVs) and a hand-rolled parser keeps this feature a self-contained
 * diff instead of adding a package for a handful of edge cases
 * (quoted fields, embedded commas/newlines in 備註, escaped quotes). */

export const PRODUCT_CSV_VERSION = 1;

export const PRODUCT_CSV_HEADERS = [
  "商品",
  "品牌",
  "分類",
  "容量",
  "庫存",
  "效期",
  "已開封",
  "備註",
] as const;

/** Parses raw CSV text into rows of string cells. Handles quoted
 * fields, escaped `""` quotes, and commas/newlines inside quotes. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  // Strip a UTF-8 BOM if present (Excel writes one; we also write one).
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Flush the final field/row if the text doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function csvEscapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsvLine(fields: string[]): string {
  return fields.map(csvEscapeField).join(",");
}

/** Builds the full CSV text (version line + header + data rows),
 * ready to be prefixed with a BOM and downloaded. */
export function buildProductCsv(rows: string[][]): string {
  const lines = [
    toCsvLine(["Version", String(PRODUCT_CSV_VERSION)]),
    toCsvLine([...PRODUCT_CSV_HEADERS]),
    ...rows.map(toCsvLine),
  ];
  return lines.join("\r\n");
}

/** Triggers a browser download of UTF-8-with-BOM text — required for
 * Traditional Chinese to display correctly when the file is opened
 * directly in Microsoft Excel. */
export function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function todayDateStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
