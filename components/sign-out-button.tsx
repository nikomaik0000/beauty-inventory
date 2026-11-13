"use client";

import { useTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { clearInventoryCaches } from "@/lib/clear-inventory-caches";

export function SignOutButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        startTransition(async () => {
          // Clear the previous next-pwa caches before the redirect can leave
          // private inventory content behind on a signed-out device.
          await clearInventoryCaches();
          navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_INVENTORY_CACHES" });
          await signOut();
        });
      }}
    >
      {children}
    </button>
  );
}

