"use client";

import { type ReactNode, type Ref, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared centered modal — dimmed backdrop, viewport-capped panel, nested
 * focus handling, and reference-counted background scroll locking.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidthClassName = "max-w-sm",
  maxHeightClassName = "max-h-[80vh]",
  viewportPaddingClassName = "p-4",
  backdropClassName = "bg-black/50",
  frameClassName: customFrameClassName,
  bodyClassName,
  contentRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  maxHeightClassName?: string;
  viewportPaddingClassName?: string;
  backdropClassName?: string;
  frameClassName?: string;
  bodyClassName?: string;
  /** Ref to the scrollable body — lets a caller (e.g. FilterPanel) use
   * it as a boundary so its own dropdowns never render past the
   * footer. Optional; nothing changes for callers that don't pass it. */
  contentRef?: Ref<HTMLDivElement>;
}) {
  const dialogId = useRef(Symbol("dialog"));
  const frameRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const [portalReady, setPortalReady] = useState(false);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Hydrate in place, then move the overlay to body before the first browser
  // paint. Portaling keeps nested dialogs out of transformed/overflow-hidden
  // ancestors without creating a server/client markup mismatch.
  useLayoutEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const currentDialogId = dialogId.current;
    dialogStack.push(currentDialogId);

    function handleKeyDown(e: KeyboardEvent) {
      if (dialogStack.at(-1) !== currentDialogId) return;
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(frameRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        closeButtonRef.current?.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const index = dialogStack.lastIndexOf(currentDialogId);
      if (index >= 0) dialogStack.splice(index, 1);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open]);

  const frameClassName = cn(
    "fixed inset-0 z-40 flex items-center justify-center",
    viewportPaddingClassName,
    customFrameClassName,
  );
  const backdropClass = cn("absolute inset-0", backdropClassName);
  const panelClassName = cn(
    "relative flex w-full flex-col overflow-hidden rounded-dialog border border-border bg-surface shadow-dialog",
    maxHeightClassName,
    maxWidthClassName,
  );
  const panelContents = (
    <>
      <div className="flex items-center justify-between border-b border-divider px-5 py-4">
        <h3 className="text-sm font-semibold text-textPrimary">
          {title}
        </h3>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={`關閉${title}`}
          className="text-textMuted hover:text-textPrimary"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div ref={contentRef} className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4", bodyClassName)}>
        {children}
      </div>

      {footer && (
        <div className="flex items-center justify-between gap-2 border-t border-divider px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:py-4">
          {footer}
        </div>
      )}
    </>
  );

  if (!open) return null;

  const dialog = (
    <div ref={frameRef} className={frameClassName}>
      <button
        type="button"
        aria-label={`關閉${title}`}
        onClick={onClose}
        className={backdropClass}
        tabIndex={-1}
      />
      <div role="dialog" aria-modal="true" aria-label={title} className={panelClassName}>
        {panelContents}
      </div>
    </div>
  );

  return portalReady ? createPortal(dialog, document.body) : dialog;
}

let bodyLockCount = 0;
const dialogStack: symbol[] = [];
let bodyLockPrevious: {
  documentOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
} | null = null;

function lockBodyScroll() {
  bodyLockCount += 1;
  if (bodyLockCount > 1) return;
  bodyLockPrevious = {
    documentOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyPaddingRight: document.body.style.paddingRight,
  };

  const widthBeforeLock = document.documentElement.clientWidth;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  const layoutShift = Math.max(0, document.documentElement.clientWidth - widthBeforeLock);
  if (layoutShift > 0) {
    const paddingRight = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.paddingRight = `${paddingRight + layoutShift}px`;
  }
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount > 0 || !bodyLockPrevious) return;
  document.documentElement.style.overflow = bodyLockPrevious.documentOverflow;
  document.body.style.overflow = bodyLockPrevious.bodyOverflow;
  document.body.style.paddingRight = bodyLockPrevious.bodyPaddingRight;
  bodyLockPrevious = null;
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(
    'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => (
    !element.hasAttribute("hidden")
    && element.getAttribute("aria-hidden") !== "true"
    && element.getClientRects().length > 0
  ));
}
