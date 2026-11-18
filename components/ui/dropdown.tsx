"use client";

import { type ReactNode, type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateOverlayPosition } from "@/lib/overlay-position";

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

/**
 * The one custom dropdown used everywhere a native `<select>` used to
 * be: same list chrome (colors, radius, typography, hover state and
 * selected-item checkmark) no matter what the trigger
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

  const calculatePosition = useCallback((): PopupPosition | null => {
    const trigger = containerRef.current;
    if (!trigger) return null;
    return calculateOverlayPosition({
      trigger: trigger.getBoundingClientRect(),
      boundary: boundaryRef?.current?.getBoundingClientRect(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      align,
    });
  }, [align, boundaryRef]);

  const openPopup = useCallback(() => {
    const nextPosition = calculatePosition();
    if (!nextPosition) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    // Selection, position, and visibility are committed together. The portal
    // never paints a stale highlight at an unset or previous coordinate.
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setPosition(nextPosition);
    setOpen(true);
  }, [calculatePosition, options, value]);

  const togglePopup = useCallback(() => {
    if (open) setOpen(false);
    else openPopup();
  }, [open, openPopup]);

  useLayoutEffect(() => {
    if (!open) return;
    const idx = options.findIndex((option) => option.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  }, [open, value, options]);

  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const option = optionRefs.current[highlightedIndex];
    if (!list || !option) return;

    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;
    if (optionTop < list.scrollTop) list.scrollTop = optionTop;
    else if (optionBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = optionBottom - list.clientHeight;
    }
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
        openPopup();
        return;
      }
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openPopup();
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
      const nextPosition = calculatePosition();
      if (!nextPosition) return;
      setPosition((current) => current
        && current.left === nextPosition.left
        && current.width === nextPosition.width
        && current.top === nextPosition.top
        && current.bottom === nextPosition.bottom
        && current.maxHeight === nextPosition.maxHeight
        ? current
        : nextPosition);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, calculatePosition]);

  const popupStyle = position ? {
    position: "fixed" as const,
    left: position.left,
    width: position.width,
    top: position.top,
    bottom: position.bottom,
    maxHeight: position.maxHeight,
  } : undefined;

  const popupContents = options.map((opt, idx) => {
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
  });

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {renderTrigger({ open, selected, toggle: togglePopup })}

      {typeof document !== "undefined" &&
        createPortal(
          open && position ? (
            <ul
              ref={listRef}
              role="listbox"
              aria-label={ariaLabel}
              style={popupStyle}
              className="z-50 min-w-[160px] overflow-y-auto rounded-dropdown border border-border bg-surface py-1 shadow-dropdown"
            >
              {popupContents}
            </ul>
          ) : null,
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
