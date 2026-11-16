"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileJson, FileWarning, SearchCheck, Upload } from "lucide-react";
import { commitProductsJsonImport, exportProductsJson, previewProductsJson } from "@/app/actions/product-json";
import { Button } from "@/components/ui/button";
import {
  buildExampleProductJson,
  type JsonImportMode,
  type JsonPreviewItem,
  type JsonPreviewResult,
  type JsonPreviewStatus,
} from "@/lib/product-json";
import { cn } from "@/lib/utils";

const modes: Array<{ value: JsonImportMode; label: string; description: string }> = [
  { value: "add", label: "新增", description: "只預覽尚不存在的 UUID；不覆蓋現有商品。" },
  { value: "update", label: "更新", description: "只比較已存在的 UUID；不以名稱自動覆蓋。" },
  { value: "replace", label: "取代", description: "同時預覽新增、更新，以及未出現在 JSON 中的待移除商品。" },
];

const statusLabels: Record<JsonPreviewStatus | "error", string> = {
  new: "新增",
  update: "更新",
  unchanged: "不變",
  delete: "刪除",
  conflict: "衝突",
  error: "錯誤",
};

const statusStyles: Record<JsonPreviewStatus, string> = {
  new: "border-emerald-200 bg-emerald-50 text-emerald-700",
  update: "border-amber-200 bg-amber-50 text-amber-700",
  unchanged: "border-border bg-surfaceMuted text-textSecondary",
  delete: "border-red-200 bg-red-50 text-red-700",
  conflict: "border-orange-200 bg-orange-50 text-orange-700",
};

function downloadJson(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function JsonDataManager() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idempotencyRef = useRef<{ token: string; key: string } | null>(null);
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState<JsonImportMode>("add");
  const [preview, setPreview] = useState<JsonPreviewResult | null>(null);
  const [confirmedNewKeys, setConfirmedNewKeys] = useState<string[]>([]);
  const [confirmationText, setConfirmationText] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"export" | "preview" | "commit" | null>(null);

  function resetPreview(nextText = rawText) {
    setRawText(nextText);
    setPreview(null);
    setConfirmedNewKeys([]);
    setConfirmationText("");
    setSuccessMessage(null);
    idempotencyRef.current = null;
    setMessage(null);
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      setMessage("請選擇 .json 檔案。");
      return;
    }
    try {
      const text = await file.text();
      resetPreview(text);
    } catch {
      setMessage("無法讀取 JSON 檔案，請確認檔案編碼。");
    }
  }

  async function handleExport() {
    setBusy("export");
    setMessage(null);
    try {
      const json = await exportProductsJson();
      downloadJson(`beauty-inventory-${dateStamp()}.json`, json);
    } catch {
      setMessage("匯出失敗，請確認登入狀態後再試一次。");
    } finally {
      setBusy(null);
    }
  }

  async function runPreview(confirmations = confirmedNewKeys) {
    if (!rawText.trim()) {
      setMessage("請貼上 JSON 或選擇檔案。");
      return;
    }
    setBusy("preview");
    setMessage(null);
    try {
      const result = await previewProductsJson(rawText, mode, confirmations);
      setPreview(result);
      idempotencyRef.current = null;
    } catch {
      setMessage("預覽失敗，請確認登入狀態或稍後再試。");
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirmAsNew(key: string) {
    const next = [...new Set([...confirmedNewKeys, key])];
    setConfirmedNewKeys(next);
    await runPreview(next);
  }

  async function handleCommit() {
    if (!preview) return;
    const execution = preview?.execution;
    if (!execution?.enabled || !execution.previewToken) return;
    const requiredText = mode === "replace" ? `REPLACE ${preview.counts.delete}` : "";
    if (requiredText && confirmationText !== requiredText) {
      setMessage(`請輸入「${requiredText}」確認取代。`);
      return;
    }
    setBusy("commit");
    setMessage(null);
    try {
      if (!idempotencyRef.current || idempotencyRef.current.token !== execution.previewToken) {
        idempotencyRef.current = { token: execution.previewToken, key: crypto.randomUUID() };
      }
      const result = await commitProductsJsonImport(
        execution.previewToken,
        idempotencyRef.current.key,
        confirmationText,
      );
      setSuccessMessage(
        `${result.status === "already-applied" ? "此批次先前已完成" : "匯入完成"}：新增 ${result.created}、更新 ${result.updated}、刪除 ${result.deleted}。`,
      );
      setPreview(null);
      setRawText("");
      setConfirmedNewKeys([]);
      setConfirmationText("");
      idempotencyRef.current = null;
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "匯入失敗，未套用任何變更。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-5 rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileJson size={19} strokeWidth={1.75} className="text-accentStrong" />
            <h2 className="font-semibold text-textPrimary">JSON 資料匯入／匯出</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-textMuted">
            JSON 包含商品資料與圖片 object path，不包含圖片實體檔案，也不是完整圖片備份。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => downloadJson("beauty-inventory-json-範例.json", JSON.stringify(buildExampleProductJson(), null, 2))}>
            <Download size={14} strokeWidth={1.75} />
            JSON 範例
          </Button>
          <Button type="button" size="sm" onClick={() => void handleExport()} disabled={busy !== null}>
            <Download size={14} strokeWidth={1.75} />
            {busy === "export" ? "匯出中…" : "匯出全部商品"}
          </Button>
        </div>
      </div>

      <div className="border-t border-divider pt-5">
        <h3 className="text-sm font-medium text-textPrimary">匯入差異預覽</h3>
        <p className="mt-1 text-xs text-textMuted">提交前會由伺服器與資料庫再次驗證；RPC 未安裝時只允許預覽。</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {modes.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setMode(option.value);
              setPreview(null);
              setConfirmedNewKeys([]);
              setConfirmationText("");
              idempotencyRef.current = null;
            }}
            className={cn(
              "min-h-20 rounded-input border p-3 text-left transition-colors",
              mode === option.value ? "border-accent bg-surfaceMuted" : "border-border bg-surface hover:bg-surfaceMuted/50",
            )}
          >
            <span className="text-sm font-medium text-textPrimary">{option.label}</span>
            <span className="mt-1 block text-xs leading-5 text-textMuted">{option.description}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <textarea
          value={rawText}
          onChange={(event) => resetPreview(event.target.value)}
          placeholder="在此貼上 Beauty Inventory JSON…"
          spellCheck={false}
          className="min-h-40 w-full resize-y rounded-input border border-border bg-background px-3 py-2 font-mono text-xs leading-5 text-textPrimary outline-none focus:border-accent"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
          <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} strokeWidth={1.75} />
            選擇 JSON 檔案
          </Button>
          <Button type="button" size="sm" onClick={() => void runPreview()} disabled={busy !== null || !rawText.trim()}>
            <SearchCheck size={14} strokeWidth={1.75} />
            {busy === "preview" ? "分析中…" : "產生差異預覽"}
          </Button>
          <span className="text-xs text-textMuted sm:ml-auto">目前模式：{modes.find((item) => item.value === mode)?.label}</span>
        </div>
      </div>

      {message && <InlineError message={message} />}
      {successMessage && <p className="rounded-input border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{successMessage}</p>}
      {preview && !preview.valid && (
        <div className="space-y-2">
          <InlineError message="JSON 格式無效，未建立有效預覽。" />
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-input border border-border p-3 text-xs text-danger">
            {preview.errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}
          </ul>
        </div>
      )}
      {preview?.valid && (
        <Preview
          result={preview}
          busy={busy !== null}
          confirmationText={confirmationText}
          onConfirmationTextChange={setConfirmationText}
          onConfirmAsNew={(key) => void handleConfirmAsNew(key)}
          onCommit={() => void handleCommit()}
        />
      )}
    </section>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-danger">
      <FileWarning size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Preview({
  result,
  busy,
  confirmationText,
  onConfirmationTextChange,
  onConfirmAsNew,
  onCommit,
}: {
  result: JsonPreviewResult;
  busy: boolean;
  confirmationText: string;
  onConfirmationTextChange: (value: string) => void;
  onConfirmAsNew: (key: string) => void;
  onCommit: () => void;
}) {
  const order: Array<JsonPreviewStatus | "error"> = ["new", "update", "unchanged", "delete", "conflict", "error"];
  return (
    <div className="space-y-4 border-t border-divider pt-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {order.map((status) => (
          <div key={status} className="rounded-input border border-border px-3 py-2">
            <p className="text-xs text-textMuted">{statusLabels[status]}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-textPrimary">{result.counts[status]}</p>
          </div>
        ))}
      </div>

      {result.mode === "replace" && result.counts.delete > 0 && (
        <p className="rounded-input border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          取代預覽包含 {result.counts.delete} 筆待移除商品；分類與品牌不會隨取代刪除。本階段不會執行移除。
        </p>
      )}

      <div className="space-y-2">
        {result.items.length === 0 ? (
          <p className="rounded-input border border-border p-4 text-center text-sm text-textMuted">JSON 中沒有商品差異。</p>
        ) : result.items.map((item) => <PreviewItem key={item.key} item={item} busy={busy} onConfirmAsNew={onConfirmAsNew} />)}
      </div>

      <div className="space-y-3 rounded-input border border-border bg-surfaceMuted/35 p-3 sm:p-4">
        {result.mode === "replace" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-danger">取代會移除 {result.counts.delete} 筆未出現在 JSON 的商品；Storage 圖片不會立即刪除。</p>
            <label className="block text-xs text-textSecondary">
              請輸入 <span className="font-mono font-semibold">REPLACE {result.counts.delete}</span>
              <input
                value={confirmationText}
                onChange={(event) => onConfirmationTextChange(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-input border border-border bg-surface px-3 font-mono text-sm outline-none focus:border-accent"
              />
            </label>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-textMuted">
            {result.execution?.enabled
              ? `提交憑證有效至 ${result.execution.expiresAt ? new Date(result.execution.expiresAt).toLocaleString("zh-TW") : "短時間內"}。`
              : result.execution?.reason ?? "尚未建立可提交的預覽憑證。"}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onCommit}
            disabled={busy || !result.execution?.enabled || (result.mode === "replace" && confirmationText !== `REPLACE ${result.counts.delete}`)}
          >
            {busy ? "處理中…" : "確認匯入"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewItem({ item, busy, onConfirmAsNew }: { item: JsonPreviewItem; busy: boolean; onConfirmAsNew: (key: string) => void }) {
  return (
    <details className="group rounded-input border border-border bg-background open:bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-sm">
        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", statusStyles[item.status])}>{statusLabels[item.status]}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-textPrimary">{item.name}</span>
        <span className="text-xs text-textMuted group-open:hidden">查看差異</span>
      </summary>
      <div className="space-y-3 border-t border-divider px-3 py-3">
        {item.message && <p className="text-xs leading-5 text-textSecondary">{item.message}</p>}
        {item.suggestedMatches.length > 0 && (
          <p className="text-xs leading-5 text-textSecondary">人工匹配提示：{item.suggestedMatches.join("、")}</p>
        )}
        {item.canConfirmAsNew && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onConfirmAsNew(item.key)}>
            確認為不同商品並重新預覽
          </Button>
        )}
        {item.changes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-xs">
              <thead className="text-textMuted"><tr><th className="py-1.5 pr-3 font-medium">欄位</th><th className="py-1.5 pr-3 font-medium">目前</th><th className="py-1.5 font-medium">JSON</th></tr></thead>
              <tbody className="divide-y divide-divider">
                {item.changes.map((change) => (
                  <tr key={change.field}>
                    <td className="py-2 pr-3 text-textSecondary">{change.label}</td>
                    <td className="break-all py-2 pr-3 text-textMuted">{change.before}</td>
                    <td className="break-all py-2 text-textPrimary">{change.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-xs text-textMuted">沒有欄位差異。</p>}
      </div>
    </details>
  );
}
