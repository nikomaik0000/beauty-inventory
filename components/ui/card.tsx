import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The shared "surface" container: rounded-card, bordered, shadow-card,
 * hover lift on shadow-cardHover. This is the same visual treatment
 * product cards, list rows, the login form, and admin panels already
 * used ad hoc — centralized here so a radius/shadow/border change only
 * needs to happen in the design system, not in every file that draws a
 * card-like box.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-border bg-surface shadow-card transition-shadow duration-base",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

/** Same shape, with the hover-lift shadow used by interactive/clickable
 * cards (e.g. product cards) — opt in per usage rather than baking
 * :hover into every Card, since not every Card is interactive. */
export const HoverCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Card ref={ref} className={cn("hover:shadow-cardHover", className)} {...props} />
  ),
);
HoverCard.displayName = "HoverCard";
