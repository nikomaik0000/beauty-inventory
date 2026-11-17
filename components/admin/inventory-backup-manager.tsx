"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArchiveRestore, RefreshCw } from "lucide-react";
import {
  commitInventoryBackupRestore,
  listInventoryBackups,
  prepareInventoryBackupRestore,
} from "@/app/actions/product-json";
import { Button } from "@/components/ui/button";
import type {
  InventoryBackupListResult,
  InventoryBackupSummary,
  InventoryRestorePreview,
} from "@/lib/inventory-backup";

export function InventoryBackupManager() {
  const idempotencyRef = useRef<{ token: string; key: string } | null>(null);
  const [list, setList] = useState<InventoryBackupListResult | null>(null);
  const [selected, setSelected] = useState<InventoryBackupSummary | null>(null);
  const [restore, setRestore] = useState<InventoryRestorePreview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"list" | "preview" | "restore" | null>("list");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy("list");
    try {
      setList(await listInventoryBackups());
    } catch {
      setList({ installed: false, reason: "無法安全讀取備份清單。", backups: [] });
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handlePreview(backup: InventoryBackupSummary) {
    setBusy("preview");
    setMessage(null);
    setSelected(backup);
    setConfirmation("");
    idempotencyRef.current = null;
    try {
      setRestore(await prepareInventoryBackupRestore(backup.id));
    } catch (error) {
      setRestore(null);
      setMessage(error instanceof Error ? error.message : "無法建立還原預覽。");
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    const token = restore?.execution.previewToken;
    if (!restore?.execution.enabled || !token || confirmation !== "RESTORE") return;
    setBusy("restore");
    setMessage(null);
    try {
      if (!idempotencyRef.current || idempotencyRef.current.token !== token) {
        idempotencyRef.current = { token, key: crypto.randomUUID() };
      }
      const result = await commitInventoryBackupRestore(token, idempotencyRef.current.key, confirmation);
      setMessage(`${result.status === "already-applied" ? "此還原先前已完成" : "還原完成"}；還原前狀態也已另存快照。`);
      setRestore(null);
      setSelected(null);
      setConfirmation("");
      idempotencyRef.current = null;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "還原失敗，未套用部分資料。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={() => void load()} disabled={busy !== null} aria-label="重新整理備份清單">
          <RefreshCw size={14} strokeWidth={1.75} />
        </Button>
      </div>

      {busy === "list" && <p className="text-xs text-textMuted">讀取備份清單…</p>}
      {list && !list.installed && (
        <p className="rounded-input border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
          {list.reason} 備份與還原維持停用，不會改用逐筆寫入。
        </p>
      )}
      {list?.installed && list.backups.length === 0 && <p className="text-xs text-textMuted">目前沒有匯入前快照。</p>}
      {list?.installed && list.backups.length > 0 && (
        <div className="space-y-2">
          {list.backups.map((backup) => (
            <div key={backup.id} className="flex flex-col gap-2 rounded-input border border-border p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 text-xs leading-5">
                <p className="font-medium text-textPrimary">{new Date(backup.createdAt).toLocaleString("zh-TW")} · {operationLabel(backup.operation)}</p>
                <p className="text-textMuted">影響 {backup.affectedCount} 件</p>
              </div>
              <Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={() => void handlePreview(backup)}>
                <ArchiveRestore size={14} strokeWidth={1.75} />
                還原預覽
              </Button>
            </div>
          ))}
        </div>
      )}

      {restore && selected && (
        <div className="space-y-3 rounded-input border border-red-200 bg-red-50/60 p-3 sm:p-4">
          <p className="text-xs leading-5 text-red-700">
            還原會覆蓋目前商品資料；快照不包含 Storage 圖片實體檔案。
          </p>
          <div>
            <p className="text-sm font-medium text-red-700">還原預覽</p>
            <p className="mt-1 text-xs leading-5 text-textSecondary">
              新增 {restore.preview.counts.new}、更新 {restore.preview.counts.update}、刪除 {restore.preview.counts.delete}、不變 {restore.preview.counts.unchanged}。
            </p>
          </div>
          {restore.preview.items.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-input border border-border bg-surface p-2 text-xs text-textSecondary">
              {restore.preview.items.map((item) => <li key={item.key}>{statusLabel(item.status)}：{item.name}</li>)}
            </ul>
          )}
          <label className="block text-xs text-textSecondary">
            請輸入 <span className="font-mono font-semibold">RESTORE</span> 確認。還原前會先建立另一份快照。
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1.5 h-10 w-full rounded-input border border-border bg-surface px-3 font-mono text-sm outline-none focus:border-accent" />
          </label>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="danger" disabled={busy !== null || confirmation !== "RESTORE" || !restore.execution.enabled} onClick={() => void handleRestore()}>
              {busy === "restore" ? "還原中…" : "確認還原"}
            </Button>
          </div>
        </div>
      )}

      {message && <p className="text-xs leading-5 text-textSecondary">{message}</p>}
    </section>
  );
}

function operationLabel(operation: InventoryBackupSummary["operation"]) {
  return { add: "新增前", update: "更新前", replace: "取代前", restore: "還原前" }[operation];
}

function statusLabel(status: string) {
  return { new: "新增", update: "更新", unchanged: "不變", delete: "刪除", conflict: "衝突" }[status] ?? status;
}
