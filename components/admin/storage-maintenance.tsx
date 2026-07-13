"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteOrphanedImages, findOrphanedImages, type OrphanedImage } from "@/app/actions/storage";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageMaintenance() {
  const [scanning, startScan] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [scanned, setScanned] = useState(false);
  const [orphans, setOrphans] = useState<OrphanedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const totalBytes = orphans.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);

  function handleScan() {
    setError(null);
    startScan(async () => {
      try {
        const result = await findOrphanedImages();
        setOrphans(result);
        setScanned(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "掃描失敗，請再試一次。");
      }
    });
  }

  function handleDeleteAll() {
    if (!confirm(`確定要刪除 ${orphans.length} 個未使用的圖片嗎？此操作無法復原。`)) return;
    setError(null);
    startDelete(async () => {
      try {
        await deleteOrphanedImages(orphans.map((f) => f.path));
        setOrphans([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "刪除失敗，請再試一次。");
      }
    });
  }

  function handleDeleteOne(path: string) {
    setError(null);
    startDelete(async () => {
      try {
        await deleteOrphanedImages([path]);
        setOrphans((prev) => prev.filter((f) => f.path !== path));
      } catch (err) {
        setError(err instanceof Error ? err.message : "刪除失敗，請再試一次。");
      }
    });
  }

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-textPrimary">儲存空間維護</h2>
      <p className="mt-1 text-xs text-textMuted">
        掃描圖片儲存空間，找出沒有被任何商品使用的圖片（例如上傳後未儲存商品所留下的檔案），並可將其清除。
      </p>

      <div className="mt-4">
        <Button size="sm" variant="secondary" onClick={handleScan} disabled={scanning}>
          {scanning ? <Loader2 size={14} className="animate-spin" /> : null}
          {scanning ? "掃描中…" : "掃描未使用的圖片"}
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {scanned && !scanning && (
        <div className="mt-4">
          {orphans.length === 0 ? (
            <p className="text-xs text-textMuted">沒有找到未使用的圖片。儲存空間很乾淨。</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-textSecondary">
                  找到 {orphans.length} 個未使用的圖片{totalBytes > 0 ? `，共 ${formatBytes(totalBytes)}` : ""}
                </p>
                <Button size="sm" variant="danger" onClick={handleDeleteAll} disabled={deleting}>
                  {deleting ? "刪除中…" : "全部刪除"}
                </Button>
              </div>

              <ul className="max-h-64 divide-y divide-divider overflow-y-auto rounded-input border border-border">
                {orphans.map((f) => (
                  <li key={f.path} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className="truncate text-textSecondary">{f.path}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-textMuted">{formatBytes(f.sizeBytes)}</span>
                      <button
                        type="button"
                        aria-label={`刪除 ${f.path}`}
                        disabled={deleting}
                        onClick={() => handleDeleteOne(f.path)}
                        className="flex h-6 w-6 items-center justify-center rounded text-textMuted hover:bg-dangerSoft hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
