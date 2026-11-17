import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getSupabaseAuthCookiePrefix,
  isInvalidRefreshTokenError,
  isSupabaseAuthCookieName,
} from "../lib/supabase-auth.ts";

const SUPABASE_URL = "https://beauty-project.supabase.co";

test("recognizes Supabase's invalid refresh token error without broad matching", () => {
  assert.equal(isInvalidRefreshTokenError({ code: "refresh_token_not_found" }), true);
  assert.equal(
    isInvalidRefreshTokenError({
      message: "Invalid Refresh Token: Refresh Token Not Found",
    }),
    true,
  );
  assert.equal(isInvalidRefreshTokenError({ message: "network request failed" }), false);
  assert.equal(isInvalidRefreshTokenError(null), false);
});

test("scopes auth-cookie cleanup to the configured Supabase project", () => {
  assert.equal(getSupabaseAuthCookiePrefix(SUPABASE_URL), "sb-beauty-project-auth-token");
  assert.equal(isSupabaseAuthCookieName("sb-beauty-project-auth-token", SUPABASE_URL), true);
  assert.equal(isSupabaseAuthCookieName("sb-beauty-project-auth-token.0", SUPABASE_URL), true);
  assert.equal(
    isSupabaseAuthCookieName("sb-beauty-project-auth-token-code-verifier", SUPABASE_URL),
    true,
  );
  assert.equal(isSupabaseAuthCookieName("sb-other-site-auth-token", SUPABASE_URL), false);
  assert.equal(isSupabaseAuthCookieName("unrelated-cookie", SUPABASE_URL), false);
});

test("homepage queries reuse the client that passed the allowlist check", async () => {
  const [homepage, queries] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/queries.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    homepage,
    /const \{ supabase \} = await requireInventoryUser\(\{ redirectToLogin: true \}\)/,
  );
  assert.match(homepage, /getProductsWithRelations\(supabase\)/);
  assert.match(homepage, /getCategories\(supabase\)/);
  assert.match(homepage, /getSubcategories\(supabase\)/);
  assert.doesNotMatch(queries, /await createClient\(\)/);
});
