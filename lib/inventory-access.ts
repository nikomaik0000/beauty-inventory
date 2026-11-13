export type InventoryAccessReason =
  | "allowed"
  | "unauthenticated"
  | "allowlist-not-configured"
  | "not-allowlisted";

export interface InventoryAccessDecision {
  allowed: boolean;
  reason: InventoryAccessReason;
  status: 200 | 401 | 403 | 503;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The allowlist is deliberately server-only. `INVENTORY_ALLOWED_USER_IDS`
 * must never use a NEXT_PUBLIC_ prefix.
 */
export function parseInventoryAllowedUserIds(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => UUID_PATTERN.test(value)),
  );
}

export function evaluateInventoryAccess(
  userId: string | null | undefined,
  rawAllowlist: string | undefined,
): InventoryAccessDecision {
  if (!userId) {
    return { allowed: false, reason: "unauthenticated", status: 401 };
  }

  const allowedIds = parseInventoryAllowedUserIds(rawAllowlist);
  if (allowedIds.size === 0) {
    return { allowed: false, reason: "allowlist-not-configured", status: 503 };
  }

  if (!allowedIds.has(userId.toLowerCase())) {
    return { allowed: false, reason: "not-allowlisted", status: 403 };
  }

  return { allowed: true, reason: "allowed", status: 200 };
}

