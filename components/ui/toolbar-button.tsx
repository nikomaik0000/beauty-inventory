import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label?: string;
  active?: boolean;
  badgeCount?: number;
  /** Required when there's no visible label, so the control still has
   * an accessible name — the icon-only Sort button, for example. */
  "aria-label"?: string;
}

/**
 * The shared toolbar control shape: same height, padding, radius,
 * border, and hover/active treatment whether it's the Filter button
 * (icon + label) or the icon-only Sort button. Border radius never
 * changes across states — only the border/text color does — by design,
 * per the design system's "shape never changes on interaction" rule.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon: Icon, label, active, badgeCount, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 shrink-0 items-center gap-2 rounded-input border border-border bg-surface text-sm font-medium text-textSecondary transition-colors duration-base hover:bg-surfaceMuted",
          label ? "px-3.5" : "w-10 justify-center",
          active && "border-accent text-accentStrong",
          className,
        )}
        {...props}
      >
        <Icon size={20} strokeWidth={1.75} />
        {label && <span className="hidden sm:inline">{label}</span>}
        {!!badgeCount && badgeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-button bg-accent px-1 text-[11px] font-semibold text-surface">
            {badgeCount}
          </span>
        )}
      </button>
    );
  },
);
ToolbarButton.displayName = "ToolbarButton";
