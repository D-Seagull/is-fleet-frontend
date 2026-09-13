import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_ROUTES, isOpenRoute } from "@/lib/routes";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legal / store-compliance pages come first and always pass through. A store
  // reviewer reads them signed out, so they must not redirect to /login; a
  // signed-in user reaches them from the app, so they must not bounce into the
  // dashboard either — which is why this is checked before both branches below.
  if (isOpenRoute(pathname)) {
    return NextResponse.next();
  }
  // Non-sensitive gate marker set by the auth store (the httpOnly refresh
  // cookie lives on the backend domain and isn't visible here). Real auth is
  // still enforced by the backend on every API call.
  const token = request.cookies.get("fleet_authed")?.value;

  // Якщо публічний роут
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    // Але вже залогінений — редіректимо
    if (token) {
      const userCookie = request.cookies.get("user")?.value;
      const user = userCookie
        ? JSON.parse(decodeURIComponent(userCookie))
        : null;
      const redirectTo = user?.role === "ADMIN" ? "/admin" : "/trucks";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return NextResponse.next();
  }

  // Захищений роут — немає токена
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // The trailing `.*\\..*` skips any path with a file extension (e.g.
  // /IS_logo.png) so public static assets aren't caught by the auth
  // redirect — otherwise unauthenticated pages (login/register) get the
  // login HTML back in place of the image and the logo renders broken.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|placeholder.*|.*\\..*).*)",
  ],
};
