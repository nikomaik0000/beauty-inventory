import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { evaluateInventoryAccess, type InventoryAccessReason } from "@/lib/inventory-access";
import { isInvalidRefreshTokenError } from "@/lib/supabase-auth";

export class InventoryAccessError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    public readonly reason: Exclude<InventoryAccessReason, "allowed">,
  ) {
    super(
      reason === "unauthenticated"
        ? "請先登入。"
        : reason === "not-allowlisted"
          ? "這個帳號沒有 Beauty Inventory 的使用權限。"
          : "Beauty Inventory 尚未設定指定帳號。",
    );
    this.name = "InventoryAccessError";
  }
}

export async function requireInventoryUser(options?: { redirectToLogin?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const decision = evaluateInventoryAccess(user?.id, process.env.INVENTORY_ALLOWED_USER_IDS);
  if (!decision.allowed) {
    if (options?.redirectToLogin) {
      const reason = isInvalidRefreshTokenError(error)
        ? "session-expired"
        : decision.reason === "unauthenticated"
          ? "login-required"
          : decision.reason;
      redirect(`/login?reason=${encodeURIComponent(reason)}`);
    }
    throw new InventoryAccessError(
      decision.status as 401 | 403 | 503,
      decision.reason as Exclude<InventoryAccessReason, "allowed">,
    );
  }

  return { supabase, user: user! };
}

