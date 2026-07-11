"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { optimizeImageForUpload, validateImageFile, ImageProcessingError } from "@/lib/image-optimize";
import { deleteProductImageByUrl, uploadProductImage, ImageUploadError } from "@/lib/product-images";

/**
 * Product image field: click or drag-and-drop to upload, large preview,
 * replace, delete. Rebuilt from scratch in Phase X.
 *
 * Flow: pick a file → instant local preview → validate → resize to
 * ~800px + WebP in the browser → upload to Supabase Storage → swap the
 * local preview for the real public URL → best-effort delete the old
 * image. Every step that can fail surfaces a specific, friendly message
 * instead of crashing the form.
 */
export function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const localPreviewRef = useRef<string | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clean up any object URL we created for the optimistic preview.
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  function setOptimisticPreview(file: File | null) {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    if (file) {
      const url = URL.createObjectURL(file);
      localPreviewRef.current = url;
      setLocalPreview(url);
    } else {
      setLocalPreview(null);
    }
  }

  async function handleFile(file: File) {
    setError(null);

    try {
      validateImageFile(file);
    } catch (err) {
      setError(err instanceof ImageProcessingError ? err.message : "這張圖片無法使用，請換一張試試。");
      return;
    }

    const previousUrl = value;
    setOptimisticPreview(file);
    setBusy(true);

    try {
      setBusyLabel("處理圖片中…");
      const optimized = await optimizeImageForUpload(file);

      setBusyLabel("上傳中…");
      const url = await uploadProductImage(optimized);

      onChange(url);
      setOptimisticPreview(null);
      if (previousUrl) void deleteProductImageByUrl(previousUrl);
    } catch (err) {
      setOptimisticPreview(null);
      if (err instanceof ImageProcessingError || err instanceof ImageUploadError) {
        setError(err.message);
      } else {
        setError("上傳失敗，請再試一次。");
      }
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  function handleDelete() {
    const previousUrl = value;
    setError(null);
    onChange("");
    if (previousUrl) void deleteProductImageByUrl(previousUrl);
  }

  const displaySrc = localPreview ?? (value || null);

  return (
    <div>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounter.current += 1;
          setDragOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCounter.current -= 1;
          if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragCounter.current = 0;
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-border bg-surfaceMuted transition-colors",
          dragOver && "border-accent bg-accentSoft",
        )}
      >
        {displaySrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: preview URLs aren't valid next/image sources
          <img src={displaySrc} alt="商品圖片預覽" className="h-full w-full object-contain p-2" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-textMuted transition-colors hover:text-accentStrong"
          >
            <ImagePlus size={22} />
            <span className="px-3 text-center text-xs leading-snug">點擊上傳或拖曳圖片到此處</span>
          </button>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface/85">
            <Loader2 size={20} className="animate-spin text-accentStrong" />
            <span className="text-[11px] text-textSecondary">{busyLabel}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium text-accentStrong hover:underline disabled:opacity-50"
        >
          <Upload size={13} />
          {value ? "更換圖片" : "上傳圖片"}
        </button>
        {value && !busy && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-medium text-danger hover:underline"
          >
            <Trash2 size={13} />
            刪除圖片
          </button>
        )}
      </div>

      <p className="mt-1 text-[11px] text-textMuted">會自動壓縮為 WebP 格式，並縮放至約 800px。</p>

      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
