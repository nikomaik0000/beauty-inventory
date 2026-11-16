"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cropImageFile } from "@/lib/image-optimize";

type Size = { width: number; height: number };
type Position = { x: number; y: number };
type CropMode = "original" | "free" | "square";

export function ImageCropDialog({ open, source, onClose, onApply }: {
  open: boolean;
  source: File | null;
  onClose: () => void;
  onApply: (file: File) => void;
}) {
  const dragRef = useRef<{ id: number; x: number; y: number; position: Position } | null>(null);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageSize, setImageSize] = useState<Size>({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
  const [mode, setMode] = useState<CropMode>("original");
  const [freeAspect, setFreeAspect] = useState(1.25);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceAspect = imageSize.width && imageSize.height ? imageSize.width / imageSize.height : 1;
  const aspect = mode === "original" ? sourceAspect : mode === "square" ? 1 : freeAspect;

  useEffect(() => {
    if (!open || !source) return;
    const url = URL.createObjectURL(source);
    setSourceUrl(url);
    setMode("original");
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setImageSize({ width: 0, height: 0 });
    return () => URL.revokeObjectURL(url);
  }, [open, source]);

  useLayoutEffect(() => {
    if (!open || !viewport) return;
    const measure = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [open, viewport, aspect]);

  useEffect(() => setPosition((current) => clampPosition(current, imageSize, viewportSize, zoom)), [imageSize, viewportSize, zoom]);

  const reset = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };
  const moveTo = (next: Position) => setPosition(clampPosition(next, imageSize, viewportSize, zoom));

  async function apply() {
    if (!source || !imageSize.width || !viewportSize.width || processing) return;
    const scale = coverScale(imageSize, viewportSize) * zoom;
    const width = viewportSize.width / scale;
    const height = viewportSize.height / scale;
    setProcessing(true);
    setError(null);
    try {
      const next = await cropImageFile(source, {
        x: imageSize.width / 2 - width / 2 - position.x / scale,
        y: imageSize.height / 2 - height / 2 - position.y / scale,
        width,
        height,
      });
      onApply(next);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "圖片裁切失敗，請再試一次。");
    } finally {
      setProcessing(false);
    }
  }

  const scale = coverScale(imageSize, viewportSize) * zoom;
  return (
    <Dialog
      open={open}
      onClose={() => { if (!processing) onClose(); }}
      title="調整圖片"
      maxWidthClassName="max-w-2xl"
      maxHeightClassName="max-h-[90dvh]"
      frameClassName="z-[60]"
      viewportPaddingClassName="p-4"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button type="button" variant="secondary" disabled={processing} onClick={reset}><RotateCcw size={14} />重設</Button>
          <div className="flex gap-2"><Button type="button" variant="secondary" disabled={processing} onClick={onClose}>取消</Button><Button type="button" disabled={processing || !imageSize.width} onClick={() => void apply()}>{processing ? "處理中…" : "套用裁切"}</Button></div>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="裁切比例">
        {([['original', '原比例'], ['free', '自由裁切'], ['square', '1:1 方形']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); reset(); }} className={`rounded-button border px-3 py-1.5 text-xs ${mode === value ? "border-accentStrong bg-accentSoft text-accentStrong" : "border-border text-textSecondary"}`}>{label}</button>
        ))}
      </div>
      {mode === "free" && <div className="flex items-center gap-3"><label htmlFor="free-aspect" className="text-xs text-textSecondary">自由比例</label><input id="free-aspect" type="range" min="0.5" max="2" step="0.05" value={freeAspect} onChange={(event) => { setFreeAspect(Number(event.target.value)); reset(); }} className="min-w-0 flex-1 accent-[#a7815b]" /><span className="w-10 text-right text-xs tabular-nums text-textMuted">{freeAspect.toFixed(2)}</span></div>}
      <div
        ref={setViewport}
        className="relative mx-auto max-w-xl touch-none overflow-hidden rounded-card bg-surfaceMuted cursor-grab"
        style={{ aspectRatio: String(aspect), maxHeight: "48dvh", width: `min(100%, calc(48dvh * ${aspect}))` }}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, position }; }}
        onPointerMove={(event) => { const drag = dragRef.current; if (drag?.id === event.pointerId) moveTo({ x: drag.position.x + event.clientX - drag.x, y: drag.position.y + event.clientY - drag.y }); }}
        onPointerUp={(event) => { if (dragRef.current?.id === event.pointerId) dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {sourceUrl && <img src={sourceUrl} alt="裁切預覽" draggable={false} onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none" style={{ width: imageSize.width * scale || undefined, height: imageSize.height * scale || undefined, transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` }} />}
        <div className="pointer-events-none absolute inset-0 rounded-card ring-1 ring-inset ring-white/70" />
      </div>
      <div className="flex items-center gap-3"><label htmlFor="image-zoom" className="text-xs font-medium text-textSecondary">縮放</label><input id="image-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="min-w-0 flex-1 accent-[#a7815b]" /><span className="w-10 text-right text-xs tabular-nums text-textMuted">{zoom.toFixed(1)}×</span></div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <p className="text-xs leading-[1.65] text-textMuted">拖曳圖片調整位置；細長瓶罐可保留原比例，商品卡片仍會完整顯示圖片。</p>
    </Dialog>
  );
}

function coverScale(image: Size, viewport: Size) {
  if (!image.width || !image.height || !viewport.width || !viewport.height) return 0;
  return Math.max(viewport.width / image.width, viewport.height / image.height);
}

function clampPosition(position: Position, image: Size, viewport: Size, zoom: number) {
  const scale = coverScale(image, viewport) * zoom;
  if (!scale) return { x: 0, y: 0 };
  const maxX = Math.max(0, (image.width * scale - viewport.width) / 2);
  const maxY = Math.max(0, (image.height * scale - viewport.height) / 2);
  return { x: Math.max(-maxX, Math.min(position.x, maxX)), y: Math.max(-maxY, Math.min(position.y, maxY)) };
}
