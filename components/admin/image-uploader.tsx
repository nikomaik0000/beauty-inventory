"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, Scissors, Trash2, Upload } from "lucide-react";
import { ImageCropDialog } from "@/components/admin/image-crop-dialog";
import { cn } from "@/lib/utils";
import { validateImageFile, ImageProcessingError } from "@/lib/image-optimize";
import { protectedProductImageUrl } from "@/lib/product-image-path";

export function ImageUploader({ value, file, onChange, onFileChange }: {
  value: string;
  file: File | null;
  onChange: (url: string) => void;
  onFileChange: (file: File | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(protectedProductImageUrl(value) ?? ""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, value]);

  const choose = useCallback((next: File | undefined) => {
    if (!next) return;
    try {
      validateImageFile(next);
      setError(null);
      onFileChange(next);
    } catch (reason) {
      setError(reason instanceof ImageProcessingError ? reason.message : "這張圖片無法使用，請換一張試試。");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [onFileChange]);

  useEffect(() => {
    const dialog = rootRef.current?.closest('[role="dialog"]') ?? rootRef.current;
    if (!dialog) return;
    const handlePaste = (event: Event) => {
      const paste = event as ClipboardEvent;
      if (paste.defaultPrevented || isTextPasteTarget(paste.target) || isTextPasteTarget(document.activeElement)) return;
      const pasted = Array.from(paste.clipboardData?.items ?? []).find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
      if (!pasted) return;
      paste.preventDefault();
      const extension = pasted.type === "image/png" ? "png" : pasted.type === "image/webp" ? "webp" : "jpg";
      choose(new File([pasted], pasted.name || `clipboard-image.${extension}`, { type: pasted.type, lastModified: Date.now() }));
    };
    dialog.addEventListener("paste", handlePaste);
    return () => dialog.removeEventListener("paste", handlePaste);
  }, [choose]);

  async function adjust() {
    setError(null);
    if (file) { setCropSource(file); setCropOpen(true); return; }
    const imageUrl = protectedProductImageUrl(value);
    if (!imageUrl) return;
    setPreparing(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("無法載入原有圖片。");
      const blob = await response.blob();
      const source = new File([blob], "existing-product-image.webp", { type: blob.type || "image/webp", lastModified: Date.now() });
      validateImageFile(source);
      setCropSource(source);
      setCropOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "無法載入原有圖片。");
    } finally {
      setPreparing(false);
    }
  }

  const hasImage = Boolean(file || value);
  return <>
    <div
      ref={rootRef}
      onDragEnter={(event) => { event.preventDefault(); dragCounter.current += 1; setDragOver(true); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={(event) => { event.preventDefault(); dragCounter.current -= 1; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragOver(false); } }}
      onDrop={(event) => { event.preventDefault(); dragCounter.current = 0; setDragOver(false); choose(event.dataTransfer.files?.[0]); }}
      className={cn("flex min-w-0 flex-col gap-3 rounded-card transition-colors min-[360px]:flex-row min-[360px]:items-start min-[360px]:gap-4", dragOver && "bg-accentSoft/60")}
    >
      <div
        className={cn("relative flex h-[120px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-border bg-surfaceMuted transition-colors", dragOver && "border-accentStrong bg-accentSoft")}
      >
        {previewUrl ? <button type="button" onClick={() => inputRef.current?.click()} className="h-full w-full" aria-label="更換商品圖片">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="商品圖片預覽" className="h-full w-full object-contain p-2" />
        </button> : <button type="button" onClick={() => inputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-textMuted hover:text-accentStrong"><ImagePlus size={22} /><span className="text-[11px]">選擇圖片</span></button>}
        {preparing && <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface/90 text-[11px] text-textSecondary"><Loader2 size={18} className="animate-spin" />載入中…</div>}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-medium tracking-[0.5px] text-textPrimary">拖曳、貼上或選擇圖片</p>
        <p className="mt-1 text-[11px] leading-[1.65] text-textMuted">可按 ⌘V／Ctrl+V 直接貼上。支援 JPG、PNG、WebP 等圖片，最大 20MB；儲存時自動壓縮為 WebP。</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" disabled={preparing} onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium text-accentStrong hover:underline disabled:opacity-50"><Upload size={14} />{hasImage ? "更換圖片" : "選擇圖片"}</button>
          {hasImage && <button type="button" disabled={preparing} onClick={() => void adjust()} className="flex items-center gap-1.5 text-xs font-medium text-accentStrong hover:underline disabled:opacity-50"><Scissors size={14} />調整圖片</button>}
          {hasImage && <button type="button" onClick={() => { setError(null); onFileChange(null); onChange(""); }} className="flex items-center gap-1.5 text-xs font-medium text-danger hover:underline"><Trash2 size={14} />刪除圖片</button>}
        </div>
        {error && <p className="mt-2 flex items-start gap-1.5 text-xs text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></p>}
      </div>
    </div>
    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => choose(event.target.files?.[0])} />
    <ImageCropDialog open={cropOpen} source={cropSource} onClose={() => { setCropOpen(false); setCropSource(null); }} onApply={(next) => onFileChange(next)} />
  </>;
}

function isTextPasteTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input, textarea, [role="textbox"], [contenteditable]:not([contenteditable="false"])'));
}
