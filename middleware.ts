import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { evaluateInventoryAccess } from "@/lib/inventory-access";
import {
  isInvalidRefreshTokenError,
  isSupabaseAuthCookieName,
} from "@/lib/supabase-auth";

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
}

function clearInvalidSupabaseSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cookieNames = new Set([
    ...request.cookies.getAll().map(({ name }) => name),
    ...response.cookies.getAll().map(({ name }) => name),
  ]);

  cookieNames.forEach((name) => {
    if (isSupabaseAuthCookieName(name, supabaseUrl)) response.cookies.delete(name);
  });
}

/** Keeps the Supabase auth session cookie fresh on every request, so
 * admin write actions (gated by `auth.role() = 'authenticated'` in the
 * RLS policies) keep working across a browsing session. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api/");
  const decision = evaluateInventoryAccess(user?.id, process.env.INVENTORY_ALLOWED_USER_IDS);

  if (isInvalidRefreshTokenError(authError)) {
    if (isPublicPage || isApiRoute) {
      clearInvalidSupabaseSession(request, response);
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("reason", "session-expired");

    const redirectResponse = NextResponse.redirect(loginUrl);
    copyResponseCookies(response, redirectResponse);
    clearInvalidSupabaseSession(request, redirectResponse);
    return redirectResponse;
  }

  if (!isPublicPage && !isApiRoute && !decision.allowed) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "reason",
      decision.reason === "unauthenticated" ? "login-required" : decision.reason,
    );

    const redirectResponse = NextResponse.redirect(loginUrl);
    copyResponseCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (isPublicPage && decision.allowed) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    const redirectResponse = NextResponse.redirect(homeUrl);
    copyResponseCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|splash|sw.js|workbox-).*)"],
};
