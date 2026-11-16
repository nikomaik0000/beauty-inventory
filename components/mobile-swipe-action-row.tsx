"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_WIDTH = 144;
const DIRECTION_THRESHOLD = 8;
const OPEN_EVENT = "beauty-inventory:mobile-swipe-open";

export function MobileSwipeActionRow({
  itemId,
  itemLabel,
  children,
  onEdit,
  onDelete,
  className,
  contentClassName,
}: {
  itemId: string;
  itemLabel: string;
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  className?: string;
  contentClassName?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);
  const startRef = useRef({ x: 0, y: 0, baseOffset: 0 });
  const directionRef = useRef<"horizontal" | "vertical" | null>(null);

  function updateOffset(next: number) {
    offsetRef.current = next;
    setOffset(next);
  }

  function announceOpen() {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: itemId }));
  }

  function close() {
    setOpen(false);
    updateOffset(0);
  }

  useEffect(() => {
    if (dragging) return;
    updateOffset(open ? -ACTION_WIDTH : 0);
  }, [dragging, open]);

  useEffect(() => {
    function closeOtherRow(event: Event) {
      if ((event as CustomEvent<string>).detail === itemId) return;
      offsetRef.current = 0;
      setOffset(0);
      setOpen(false);
    }

    window.addEventListener(OPEN_EVENT, closeOtherRow);
    return () => window.removeEventListener(OPEN_EVENT, closeOtherRow);
  }, [itemId]);

  useEffect(() => {
    if (!open) return;

    function closeWhenTouchingElsewhere(event: PointerEvent) {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      offsetRef.current = 0;
      setOffset(0);
      setOpen(false);
    }

    document.addEventListener("pointerdown", closeWhenTouchingElsewhere);
    return () => document.removeEventListener("pointerdown", closeWhenTouchingElsewhere);
  }, [open]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (window.matchMedia("(min-width: 640px)").matches) return;
    const touch = event.touches[0];
    startRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      baseOffset: open ? -ACTION_WIDTH : 0,
    };
    directionRef.current = null;
    setDragging(false);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (window.matchMedia("(min-width: 640px)").matches) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - startRef.current.x;
    const deltaY = touch.clientY - startRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!directionRef.current) {
      if (Math.max(absX, absY) < DIRECTION_THRESHOLD) return;
      if (absX > absY * 1.2) directionRef.current = "horizontal";
      else if (absY > absX * 1.2) directionRef.current = "vertical";
      else return;
    }

    if (directionRef.current !== "horizontal") return;
    setDragging(true);
    if (deltaX < 0) announceOpen();
    updateOffset(Math.max(-ACTION_WIDTH, Math.min(0, startRef.current.baseOffset + deltaX)));
  }

  function finishTouch() {
    if (directionRef.current === "horizontal") {
      const shouldOpen = offsetRef.current <= -ACTION_WIDTH / 2;
      setOpen(shouldOpen);
      updateOffset(shouldOpen ? -ACTION_WIDTH : 0);
      if (shouldOpen) announceOpen();
    }
    directionRef.current = null;
    setDragging(false);
  }

  return (
    <div
      ref={rootRef}
      data-mobile-swipe-row={itemId}
      className={cn("relative min-w-0 overflow-hidden sm:overflow-visible", className)}
    >
      <div
        className="absolute inset-y-0 right-0 grid w-36 grid-cols-2 overflow-hidden rounded-input sm:hidden"
        aria-label={`${itemLabel} 快速操作`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            close();
            onEdit();
          }}
          className="flex min-h-11 flex-col items-center justify-center gap-1 bg-accentSoft px-2 text-xs font-medium text-accentStrong"
        >
          <Pencil size={18} strokeWidth={1.8} />
          編輯
        </button>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            close();
            void onDelete();
          }}
          className="flex min-h-11 flex-col items-center justify-center gap-1 bg-dangerSoft px-2 text-xs font-medium text-danger"
        >
          <Trash2 size={18} strokeWidth={1.8} />
          刪除
        </button>
      </div>

      <div
        className={cn(
          "relative z-[1] min-w-0 bg-surface transition-transform duration-200 ease-out touch-pan-y sm:!translate-x-0",
          contentClassName,
        )}
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transitionDuration: dragging ? "0ms" : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishTouch}
        onTouchCancel={finishTouch}
        onClick={() => {
          if (open) close();
        }}
      >
        {children}
      </div>
    </div>
  );
}
