"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileWarning } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importProductRows, type ImportSummary } from "@/app/actions/csv-import";
import {
  parseAndValidateProductCsv,
  countNewVsUpdated,
  type ParsedImportResult,
  type ValidImportRow,
} from "@/lib/csv-import";
import type { Category, ProductWithRelations } from "@/lib/types";

type Stage = "select" | "preview" | "importing" | "summary";

export function CsvImportDialog({
  open,
  onClose,
  categories,
  products,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  products: ProductWithRelations[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("select");
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImportResult | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function reset() {
    setStage("select");
    setFileError(null);
    setParsed(null);
    setSummary(null);
    setDragOver(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setFileError(null);

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setFileError("不支援的檔案格式，請選擇 .csv 檔案。");
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setFileError("讀取檔案時發生編碼錯誤，請確認檔案為 UTF-8 編碼。");
      return;
    }

    if (!text.trim()) {
      setFileError("CSV 檔案是空的。");
      return;
    }

    let result: ParsedImportResult;
    try {
      result = parseAndValidateProductCsv(text, categories, products);
    } catch {
      setFileError("CSV 格式無效，無法解析。");
      return;
    }

    if (result.totalRows === 0) {
      setFileError("CSV 中找不到任何資料列，或缺少必要欄位（商品、品牌）。");
      return;
    }

    setParsed(result);
    setStage("preview");
  }

  async function handleConfirm() {
    if (!parsed) return;
    setStage("importing");
    try {
      const result = await importProductRows(parsed.valid);
      setSummary(result);
      setStage("summary");
      router.refresh();
    } catch {
      setFileError("匯入失敗，請稍後再試一次。");
      setStage("preview");
    }
  }

  const title =
    stage === "summary" ? "匯入完成" : stage === "preview" ? "匯入預覽" : "匯入 CSV";

  const footer =
    stage === "preview" && parsed ? (
      <div className="flex w-full justify-end gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={handleClose}>
          取消
        </Button>
        <Button type="button" size="sm" onClick={handleConfirm} disabled={parsed.valid.length === 0}>
          確認匯入
        </Button>
      </div>
    ) : stage === "summary" ? (
      <div className="flex w-full justify-end">
        <Button type="button" size="sm" onClick={handleClose}>
          關閉
        </Button>
      </div>
    ) : undefined;

  return (
    <Dialog open={open} onClose={handleClose} title={title} maxWidthClassName="max-w-lg" footer={footer}>
      {stage === "select" && (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-input border border-dashed p-8 text-center transition-colors duration-base ${
              dragOver ? "border-accent bg-surfaceMuted" : "border-border"
            }`}
          >
            <UploadCloud size={28} strokeWidth={1.5} className="text-textMuted" />
            <p className="text-sm text-textPrimary">拖放 CSV 檔案到這裡</p>
            <p className="text-xs text-textMuted">或</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              選擇檔案
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
          {fileError && (
            <div className="mt-3 flex items-start gap-2 text-xs text-danger">
              <FileWarning size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </div>
      )}

      {stage === "preview" && parsed && (
        <PreviewSummary parsed={parsed} fileError={fileError} />
      )}

      {stage === "importing" && (
        <p className="py-6 text-center text-sm text-textMuted">匯入中，請稍候…</p>
      )}

      {stage === "summary" && summary && (
        <ImportResultSummary summary={summary} skipped={parsed?.skipped.length ?? 0} />
      )}
    </Dialog>
  );
}

function PreviewSummary({ parsed, fileError }: { parsed: ParsedImportResult; fileError: string | null }) {
  const { newCount, updatedCount } = countNewVsUpdated(parsed.valid);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="總列數" value={parsed.totalRows} />
        <Stat label="新增商品" value={newCount} />
        <Stat label="更新商品" value={updatedCount} />
        <Stat label="略過列數" value={parsed.skipped.length} />
      </div>

      {parsed.invalid.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-danger">無效列（{parsed.invalid.length}）</p>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-input border border-border p-2 text-xs text-textSecondary">
            {parsed.invalid.map((row) => (
              <li key={row.rowNumber}>
                第 {row.rowNumber} 列：{row.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {fileError && <p className="text-xs text-danger">{fileError}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-input border border-border px-3 py-2">
      <p className="text-xs text-textMuted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-textPrimary">{value}</p>
    </div>
  );
}

function ImportResultSummary({ summary, skipped }: { summary: ImportSummary; skipped: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="新增" value={summary.created} />
        <Stat label="更新" value={summary.updated} />
        <Stat label="略過" value={skipped} />
        <Stat label="失敗" value={summary.failed} />
      </div>
      {summary.errors.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-input border border-border p-2 text-xs text-danger">
          {summary.errors.map((e) => (
            <li key={e.rowNumber}>
              第 {e.rowNumber} 列：{e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

