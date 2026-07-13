import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The shared "surface" container: rounded-card, bordered, shadow-card.
 * Deliberately static — no hover-lift variant (removed in Phase 4B; the
 * app's cards stay completely still on hover by request). This is the
 * same visual treatment product cards, list rows, the login form, and
 * admin panels already used ad hoc — centralized here so a
 * radius/shadow/border change only needs to happen in the design
 * system, not in every file that draws a card-like box.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-border bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
