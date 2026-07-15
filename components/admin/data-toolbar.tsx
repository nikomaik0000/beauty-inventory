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
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus size={14} strokeWidth={1.75} />
            新增商品
          </Button>
        </Link>
        <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
          <Upload size={14} strokeWidth={1.75} />
          匯入 CSV
        </Button>
        <Button size="sm" variant="secondary" onClick={handleExport}>
          <FileDown size={14} strokeWidth={1.75} />
          匯出 CSV
        </Button>
        <Button size="sm" variant="secondary" onClick={handleDownloadSample}>
          <Download size={14} strokeWidth={1.75} />
          下載範例
        </Button>
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
