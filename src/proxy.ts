import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  // Якщо публічний роут
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|placeholder.*).*)",
  ],
};
