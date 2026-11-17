interface SupabaseAuthErrorLike {
  code?: unknown;
  message?: unknown;
}

/** Auth can return either a stable error code or only the API message,
 * depending on the installed auth-js version. Keep this check narrow so
 * unrelated network/auth errors remain fail-closed without discarding a
 * potentially valid session. */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as SupabaseAuthErrorLike;
  if (code === "refresh_token_not_found") return true;

  return (
    typeof message === "string" &&
    message.toLowerCase().includes("invalid refresh token") &&
    message.toLowerCase().includes("refresh token not found")
  );
}

export function getSupabaseAuthCookiePrefix(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

/** Matches only this project's auth cookie and its chunk/code-verifier
 * variants, so an expired Beauty Inventory session cannot clear cookies
 * belonging to another Supabase project on the same host. */
export function isSupabaseAuthCookieName(
  cookieName: string,
  supabaseUrl: string | undefined,
): boolean {
  const prefix = getSupabaseAuthCookiePrefix(supabaseUrl);
  if (!prefix) return false;

  return (
    cookieName === prefix ||
    cookieName.startsWith(`${prefix}.`) ||
    cookieName.startsWith(`${prefix}-`)
  );
}
