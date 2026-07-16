"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, FileDown, Plus, Upload } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { buildProductCsv, downloadCsv, todayDateStamp } from "@/lib/csv";
import { productToCsvRow } from "@/lib/csv-import";
import { cn } from "@/lib/utils";
import { animation } from "@/lib/design-system";
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
  const [csvMenuOpen, setCsvMenuOpen] = useState(false);
  const csvMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!csvMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (csvMenuRef.current && !csvMenuRef.current.contains(e.target as Node)) setCsvMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setCsvMenuOpen(false);
    }
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [csvMenuOpen]);

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
      {/* Mobile (below sm:): 新增商品 alone on its own full-width row,
          CSV's three low-frequency actions collapsed into one
          "匯入 / 匯出 ▼" dropdown trigger on the row below — instead of
          four buttons competing for space. Buttons are 36px tall
          (h-9), slightly tighter horizontal padding, closer to native
          iOS toolbar sizing. Desktop (sm:+) is completely untouched:
          the original wrapping flex row, full labels, three separate
          secondary buttons, and `ml-auto`-pinned primary button. */}
      <div className="flex w-full flex-col gap-2 sm:hidden">
        <Link href="/admin/products/new" className="w-full">
          <Button className="h-9 w-full justify-center px-3">
            <Plus size={14} strokeWidth={1.75} />
            新增
          </Button>
        </Link>

        <div ref={csvMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setCsvMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={csvMenuOpen}
            className={cn(
              "flex h-9 w-full items-center justify-center gap-1.5 rounded-button border border-border bg-surface px-3 text-sm font-medium text-textPrimary transition-colors duration-base hover:bg-surfaceMuted",
              csvMenuOpen && "border-accent text-accentStrong",
            )}
          >
            匯入 / 匯出
            <ChevronDown size={14} strokeWidth={1.75} className={cn("transition-transform duration-base", csvMenuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {csvMenuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: animation.motion.fast, ease: animation.motion.ease }}
                className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-white/60 bg-surface/75 p-1.5 shadow-xl shadow-black/5 backdrop-blur-xl backdrop-saturate-150"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCsvMenuOpen(false);
                    setImportOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-left text-sm text-textPrimary transition-colors duration-fast hover:bg-surfaceMuted"
                >
                  <Upload size={14} strokeWidth={1.75} />
                  匯入 CSV
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCsvMenuOpen(false);
                    handleExport();
                  }}
                  className="flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-left text-sm text-textPrimary transition-colors duration-fast hover:bg-surfaceMuted"
                >
                  <FileDown size={14} strokeWidth={1.75} />
                  匯出 CSV
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCsvMenuOpen(false);
                    handleDownloadSample();
                  }}
                  className="flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-left text-sm text-textPrimary transition-colors duration-fast hover:bg-surfaceMuted"
                >
                  <Download size={14} strokeWidth={1.75} />
                  下載範例
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Desktop (sm:+): original, unmodified three-button + primary row. */}
      <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-3">
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
        <Link href="/admin/products/new" className="ml-auto">
          <Button size="sm">
            <Plus size={14} strokeWidth={1.75} />
            新增商品
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
