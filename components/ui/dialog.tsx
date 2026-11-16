"use client";

import { type ReactNode, type Ref, useEffect, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { animation } from "@/lib/design-system";

/**
 * Shared centered modal — dimmed backdrop, always capped to the
 * viewport, same popup animation on every use. FilterPanel used to
 * build this chrome by hand; this is that markup lifted out so any
 * future dialog (and any tweak to how dialogs animate/look) lives in
 * one place.
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
  animated = true,
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
  animated?: boolean;
  /** Ref to the scrollable body — lets a caller (e.g. FilterPanel) use
   * it as a boundary so its own dropdowns never render past the
   * footer. Optional; nothing changes for callers that don't pass it. */
  contentRef?: Ref<HTMLDivElement>;
}) {
  const dialogId = useRef(Symbol("dialog"));
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const fadeTransition = {
    duration: reduceMotion ? 0 : animation.motion.base,
    ease: animation.motion.ease,
  };

  // Escape closes the dialog, same as clicking the backdrop or the × —
  // standard dialog behavior, not a new interaction. A nested open
  // dropdown handles its own Escape first and stops it from bubbling
  // here, so closing a dropdown and closing the dialog stay two
  // separate key presses.
  useEffect(() => {
    if (!open) return;
    const currentDialogId = dialogId.current;
    dialogStack.push(currentDialogId);
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && dialogStack.at(-1) === currentDialogId) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const index = dialogStack.lastIndexOf(currentDialogId);
      if (index >= 0) dialogStack.splice(index, 1);
    };
  }, [open, onClose]);

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

  if (!animated) {
    if (!open) return null;
    return (
      <div className={frameClassName}>
        <button
          type="button"
          aria-label={`關閉${title}`}
          onClick={onClose}
          className={backdropClass}
        />
        <div role="dialog" aria-modal="true" aria-label={title} className={panelClassName}>
          {panelContents}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div className={frameClassName}>
          <motion.button
            type="button"
            aria-label={`關閉${title}`}
            onClick={onClose}
            className={backdropClass}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
            className={panelClassName}
          >
            {panelContents}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

let bodyLockCount = 0;
const dialogStack: symbol[] = [];
let bodyLockScrollY = 0;
let bodyLockPrevious: Record<string, string> | null = null;

function lockBodyScroll() {
  bodyLockCount += 1;
  if (bodyLockCount > 1) return;
  bodyLockScrollY = window.scrollY;
  bodyLockPrevious = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
    paddingRight: document.body.style.paddingRight,
  };
  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  const paddingRight = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${bodyLockScrollY}px`;
  document.body.style.width = "100%";
  document.body.style.paddingRight = `${paddingRight + scrollbarWidth}px`;
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount > 0 || !bodyLockPrevious) return;
  document.body.style.overflow = bodyLockPrevious.overflow;
  document.body.style.position = bodyLockPrevious.position;
  document.body.style.top = bodyLockPrevious.top;
  document.body.style.width = bodyLockPrevious.width;
  document.body.style.paddingRight = bodyLockPrevious.paddingRight;
  bodyLockPrevious = null;
  window.scrollTo(0, bodyLockScrollY);
}
