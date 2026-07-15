"use client";

import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { animation } from "@/lib/design-system";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface PopupPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const POPUP_GAP = 8; // matches the previous `mt-2` visual gap
const POPUP_MAX_HEIGHT = 288; // matches the previous `max-h-72`
const POPUP_MIN_HEIGHT = 120; // never shrink the list below something usable

/**
 * The one custom dropdown used everywhere a native `<select>` used to
 * be: same list chrome (colors, radius, typography, hover state,
 * selected-item checkmark, popup animation) no matter what the trigger
 * looks like. `renderTrigger` supplies the trigger itself — an
 * icon-only toolbar button, a full-width field, whatever the caller
 * needs — so this component never renders a `<button>` inside another
 * `<button>`.
 *
 * The option list is portaled to `document.body` and positioned with
 * `position: fixed` from the trigger's own bounding rect (Popper-style
 * "flip" behavior): it opens downward when there's room, upward when
 * there isn't, and its max-height is clamped to whichever space it's
 * using — so it's never clipped by an ancestor's `overflow-y-auto`
 * (e.g. the Filter dialog) and never produces a second, nested
 * scrollbar. This only affects the popup itself; the trigger's
 * styling is unchanged.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  renderTrigger,
  align = "left",
  ariaLabel,
  boundaryRef,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  renderTrigger: (args: { open: boolean; selected: DropdownOption<T> | undefined; toggle: () => void }) => ReactNode;
  align?: "left" | "right";
  ariaLabel: string;
  /** Clip/flip against this element's bounds instead of the viewport —
   * e.g. a dialog's scrollable body, so the popup never overlaps the
   * dialog's fixed footer. Falls back to the viewport when omitted. */
  boundaryRef?: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Keyboard nav lives on the trigger's own container (not a window
  // listener) so it only ever reacts while this dropdown has focus.
  // Escape calls stopPropagation so it closes just this dropdown first
  // — the dialog's own Escape handler only sees the key once the
  // dropdown is already closed, giving the expected "Esc, Esc" order
  // instead of both closing on the same press.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      if (!open) return;
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      if (!open) return; // let the trigger's native onClick handle opening
      e.preventDefault();
      const opt = options[highlightedIndex];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
    }
  }

  // Recomputes placement/size whenever the popup opens and on every
  // resize/scroll while it's open — `scroll` is registered with
  // `capture: true` so it also fires for scrolling inside a nested
  // container (like the Filter dialog's content area), which doesn't
  // bubble a scroll event to window otherwise.
  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = containerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const boundary = boundaryRef?.current?.getBoundingClientRect();
      const viewportBottom = boundary ? Math.min(boundary.bottom, window.innerHeight) : window.innerHeight;
      const viewportTop = boundary ? Math.max(boundary.top, 0) : 0;
      const spaceBelow = viewportBottom - rect.bottom - POPUP_GAP;
      const spaceAbove = rect.top - viewportTop - POPUP_GAP;
      const openUpward = spaceBelow < POPUP_MIN_HEIGHT && spaceAbove > spaceBelow;

      setPosition({
        left: align === "right" ? rect.right - Math.max(rect.width, 160) : rect.left,
        width: rect.width,
        top: openUpward ? undefined : rect.bottom + POPUP_GAP,
        bottom: openUpward ? window.innerHeight - rect.top + POPUP_GAP : undefined,
        maxHeight: Math.max(Math.min(POPUP_MAX_HEIGHT, openUpward ? spaceAbove : spaceBelow), POPUP_MIN_HEIGHT),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, align, boundaryRef]);

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {renderTrigger({ open, selected, toggle: () => setOpen((v) => !v) })}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && position && (
              <motion.ul
                ref={listRef}
                role="listbox"
                aria-label={ariaLabel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: animation.motion.fast, ease: animation.motion.ease }}
                style={{
                  position: "fixed",
                  left: position.left,
                  width: align === "right" ? undefined : position.width,
                  minWidth: align === "right" ? Math.max(position.width, 160) : undefined,
                  top: position.top,
                  bottom: position.bottom,
                  maxHeight: position.maxHeight,
                }}
                className="z-50 min-w-[160px] overflow-y-auto rounded-dropdown border border-border bg-surface py-1 shadow-dropdown"
              >
                {options.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <li key={opt.value}>
                      <button
                        ref={(el) => {
                          optionRefs.current[idx] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors duration-fast hover:bg-surfaceMuted",
                          isHighlighted && "bg-surfaceMuted",
                          isSelected ? "font-medium text-accentStrong" : "text-textPrimary",
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check size={14} strokeWidth={1.75} className="shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/**
 * Convenience wrapper for the common case: a full-width field that
 * looks like the `<Select>` it replaces (border, radius-input, chevron)
 * but shows the custom popup above instead of the native one.
 */
export function DropdownField<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  disabled,
  boundaryRef,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  boundaryRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dropdown
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel={ariaLabel}
      boundaryRef={boundaryRef}
      renderTrigger={({ open, selected, toggle }) => (
        <button
          type="button"
          disabled={disabled}
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-input border border-border bg-surface px-3.5 text-left text-sm text-textPrimary transition-colors duration-base",
            disabled ? "cursor-not-allowed opacity-50" : "hover:bg-surfaceMuted",
            open && "border-accent",
          )}
        >
          <span className={cn("truncate", !selected && "text-textMuted")}>{selected?.label ?? placeholder}</span>
          <ChevronDown size={14} strokeWidth={1.75} className={cn("shrink-0 text-textMuted transition-transform duration-base", open && "rotate-180")} />
        </button>
      )}
    />
  );
}
