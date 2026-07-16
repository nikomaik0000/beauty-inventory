"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileDown, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { buildProductCsv, downloadCsv, todayDateStamp } from "@/lib/csv";
import { productToCsvRow } from "@/lib/csv-import";
import type { Category, ProductWithRelations } from "@/lib/types";

const SAMPLE_CSV_ROW = [
  "光采無瑕妝前凝霜",
  "肌膚之鑰",
  "妝前",
  "37",
  "2",
  "2027-06-11",
  "true",
  "B:2027/12/23",
];

export function DataToolbar({
  visibleProducts,
  allProducts,
  categories,
}: {
  visibleProducts: ProductWithRelations[];
  allProducts: ProductWithRelations[];
  categories: Category[];
}) {
  const [importOpen, setImportOpen] = useState(false);

  function handleExport() {
    const csvText = buildProductCsv(visibleProducts.map(productToCsvRow));
    downloadCsv(`beauty-inventory-${todayDateStamp()}.csv`, csvText);
  }

  function handleDownloadSample() {
    const csvText = buildProductCsv([SAMPLE_CSV_ROW]);
    downloadCsv("beauty-inventory-範例.csv", csvText);
  }

  return (
    <>
      {/* Mobile: one equal-width 4-up row (grid) so the primary action
          never wraps to its own line. Desktop (sm:+): back to the
          original wrapping flex row with `ml-auto` pinning 新增商品 to
          the far right — completely unchanged from before. Each button
          carries two label spans, swapped by breakpoint, so the mobile
          row gets short labels (匯入/匯出/範例/新增) without touching
          the desktop copy (匯入 CSV/匯出 CSV/下載範例/新增商品). */}
      <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setImportOpen(true)}
          className="w-full justify-center sm:w-auto"
        >
          <Upload size={14} strokeWidth={1.75} />
          <span className="sm:hidden">匯入</span>
          <span className="hidden sm:inline">匯入 CSV</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExport}
          className="w-full justify-center sm:w-auto"
        >
          <FileDown size={14} strokeWidth={1.75} />
          <span className="sm:hidden">匯出</span>
          <span className="hidden sm:inline">匯出 CSV</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownloadSample}
          className="w-full justify-center sm:w-auto"
        >
          <Download size={14} strokeWidth={1.75} />
          <span className="sm:hidden">範例</span>
          <span className="hidden sm:inline">下載範例</span>
        </Button>
        {/* Primary action stays visually emphasized (filled `Button`
            default variant). `ml-auto` pins it to the far right of this
            row on its own — no order-* juggling, and it keeps working
            correctly if this row's container ever grows wider (e.g. a
            future full-width toolbar) since it's real flex spacing, not
            just a fixed visual position. On mobile it's simply the 4th
            grid cell, so `ml-auto` is scoped to `sm:` only. */}
        <Link href="/admin/products/new" className="w-full sm:ml-auto sm:w-auto">
          <Button size="sm" className="w-full justify-center sm:w-auto">
            <Plus size={14} strokeWidth={1.75} />
            <span className="sm:hidden">新增</span>
            <span className="hidden sm:inline">新增商品</span>
          </Button>
        </Link>
      </div>

      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        categories={categories}
        products={allProducts}
      />
    </>
  );
}
