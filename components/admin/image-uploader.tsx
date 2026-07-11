"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { isImageFile, optimizeImageForUpload } from "@/lib/image-optimize";
import { deleteProductImageByUrl, uploadProductImage } from "@/lib/product-images";

export function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!isImageFile(file)) {
      setError("請選擇圖片檔案。");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const previousUrl = value;
      const optimized = await optimizeImageForUpload(file);
      const url = await uploadProductImage(optimized);
      onChange(url);
      if (previousUrl) void deleteProductImageByUrl(previousUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗，請再試一次。");
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    const previousUrl = value;
    onChange("");
    if (previousUrl) void deleteProductImageByUrl(previousUrl);
  }

  return (
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
        className={cn(
          "relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-border bg-surfaceMuted transition-colors",
          dragOver && "border-accent bg-accentSoft",
        )}
      >
        {value ? (
          <Image src={value} alt="商品圖片預覽" fill sizes="160px" className="object-contain p-2" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-textMuted transition-colors hover:text-accentStrong"
          >
            <ImagePlus size={22} />
            <span className="px-3 text-center text-xs leading-snug">
              點擊上傳或拖曳圖片到此處
            </span>
          </button>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
            <Loader2 size={20} className="animate-spin text-accentStrong" />
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
        {value && (
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-medium text-danger hover:underline disabled:opacity-50"
          >
            <Trash2 size={13} />
            刪除圖片
          </button>
        )}
      </div>

      <p className="mt-1 text-[11px] text-textMuted">會自動壓縮為 WebP 格式，並縮放至約 800px。</p>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
