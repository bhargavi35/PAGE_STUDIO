import { NextRequest, NextResponse } from "next/server";
import { roleFromRequestCookies, can } from "@/lib/auth/session";

/**
 * RBAC enforcement at the edge. Two job:
 *   - /studio/*        : editor + publisher only.
 *   - /api/publish     : publisher only.
 *
 * UI components also reflect role-based affordances, but server-side
 * enforcement here is the source of truth — direct requests are blocked
 * regardless of UI state.
 */
export function middleware(request: NextRequest) {
  const role = roleFromRequestCookies(request.headers.get("cookie"));
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/studio") && !can(role, "canEdit")) {
    const url = request.nextUrl.clone();
    // viewer/anonymous -> /403 (so the failure is visible & explained).
    // Production could also distinguish "no role -> /login" vs "wrong role -> /403";
    // for this iteration both go to /403, which links to /login.
    url.pathname = "/403";
    url.searchParams.set("from", pathname);
    url.searchParams.set("reason", "edit-access-required");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api/publish") && !can(role, "canPublish")) {
    return new NextResponse(
      JSON.stringify({ error: "forbidden", reason: "publish role required" }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/api/publish/:path*"],
};
