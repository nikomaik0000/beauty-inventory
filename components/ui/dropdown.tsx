"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { animation } from "@/lib/design-system";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

/**
 * The one custom dropdown used everywhere a native `<select>` used to
 * be: same list chrome (colors, radius, typography, hover state,
 * selected-item checkmark, popup animation) no matter what the trigger
 * looks like. `renderTrigger` supplies the trigger itself — an
 * icon-only toolbar button, a full-width field, whatever the caller
 * needs — so this component never renders a `<button>` inside another
 * `<button>`.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  renderTrigger,
  align = "left",
  ariaLabel,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  renderTrigger: (args: { open: boolean; selected: DropdownOption<T> | undefined; toggle: () => void }) => ReactNode;
  align?: "left" | "right";
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {renderTrigger({ open, selected, toggle: () => setOpen((v) => !v) })}

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animation.motion.fast, ease: animation.motion.ease }}
            className={cn(
              "absolute z-30 mt-2 max-h-72 min-w-[160px] overflow-y-auto rounded-dropdown border border-border bg-surface py-1 shadow-dropdown",
              align === "right" ? "right-0" : "left-0 w-full",
            )}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors duration-fast hover:bg-surfaceMuted",
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
      </AnimatePresence>
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
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <Dropdown
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel={ariaLabel}
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
