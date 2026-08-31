import { NextRequest, NextResponse } from "next/server";
import { getPortalFromHost, type AuthPortal } from "./lib/portal";

const PORTAL_LOGIN_PATHS: Record<AuthPortal, string> = {
  admin: "/admin/login",
  teacher: "/teacher/login",
  student: "/login",
};

function isPortalPath(pathname: string, portal: AuthPortal): boolean {
  if (pathname === "/dashboard") return true;

  if (portal === "student") {
    return (
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/first-login/") ||
      pathname === "/student" ||
      pathname.startsWith("/student/")
    );
  }

  return pathname === `/${portal}` || pathname.startsWith(`/${portal}/`);
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const portal = getPortalFromHost(host);
  if (!portal || request.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  if (!isPortalPath(request.nextUrl.pathname, portal)) {
    return NextResponse.redirect(new URL(PORTAL_LOGIN_PATHS[portal], request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-estude-portal", portal);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)"],
};
