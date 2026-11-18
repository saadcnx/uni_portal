import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "lms_session";

// Routes that require an active session hint
const DASHBOARD_ROUTES = [
  "/dashboard",
  "/labs",
  "/users",
  "/staff",
  "/patients",
];

function isDashboardRoute(pathname: string): boolean {
  return DASHBOARD_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Route guard proxy.
 * Checks for the presence of the lms_session cookie hint.
 * - Redirects to /login when lms_session is missing on protected dashboard routes.
 * - Redirects to /dashboard when lms_session exists and the user visits /login.
 * Note: Never verifies JWT tokens here; token verification is handled by the backend.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // If user visits /login
  if (pathname === "/login") {
    // If explicitly marked as expired or logged out, clear cookie and allow login page
    if (
      request.nextUrl.searchParams.has("expired") ||
      request.nextUrl.searchParams.has("logout")
    ) {
      const response = NextResponse.next();
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // If user visits a protected dashboard route without a session hint, redirect to /login
  if (isDashboardRoute(pathname)) {
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (/api/:path*)
     * - static asset extensions
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
