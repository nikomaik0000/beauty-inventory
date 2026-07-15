"use client";

import { type ReactNode, type Ref, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  contentRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  /** Ref to the scrollable body — lets a caller (e.g. FilterPanel) use
   * it as a boundary so its own dropdowns never render past the
   * footer. Optional; nothing changes for callers that don't pass it. */
  contentRef?: Ref<HTMLDivElement>;
}) {
  // Escape closes the dialog, same as clicking the backdrop or the × —
  // standard dialog behavior, not a new interaction. A nested open
  // dropdown handles its own Escape first and stops it from bubbling
  // here, so closing a dropdown and closing the dialog stay two
  // separate key presses.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label={`關閉${title}`}
            onClick={onClose}
            className="absolute inset-0 bg-textPrimary/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animation.motion.fast }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animation.motion.base }}
            className={cn(
              "relative flex max-h-[80vh] w-full flex-col overflow-hidden rounded-dialog border border-border bg-surface shadow-dialog",
              maxWidthClassName,
            )}
          >
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <h3 className="text-sm font-semibold text-textPrimary">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={`關閉${title}`}
                className="text-textMuted hover:text-textPrimary"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <div ref={contentRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {children}
            </div>

            {footer && <div className="flex items-center justify-between gap-2 border-t border-divider px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
