import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function SettingsSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group overflow-hidden rounded-card border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-6 text-textPrimary [&::-webkit-details-marker]:hidden sm:px-7">
        <span className="shrink-0 text-accentStrong">{icon}</span>
        <h2 className="min-w-0 flex-1 font-semibold">{title}</h2>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className="shrink-0 text-textMuted transition-transform duration-fast group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-divider px-6 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
        {children}
      </div>
    </details>
  );
}

