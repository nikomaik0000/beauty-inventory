import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "accent" | "danger" | "warning" | "success" | "muted";

const toneClasses: Record<BadgeTone, string> = {
  default: "bg-badgeBg border-badgeBorder text-badgeText",
  accent: "bg-accentSoft border-transparent text-accentStrong",
  danger: "bg-dangerSoft border-transparent text-danger",
  warning: "bg-warningSoft border-transparent text-warning",
  success: "bg-transparent border-success/40 text-success",
  muted: "bg-surfaceMuted border-transparent text-textMuted",
};

export function Badge({
  children,
  tone = "default",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-badge border px-2.5 py-0.5 text-xs font-medium leading-5",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
