/**
 * Edge middleware — redirect / to the appropriate locale route.
 *
 * Priority:
 *   1. `lang` cookie (set by LangToggle on explicit user choice)
 *   2. English. The site defaults to /en for everyone (founder call,
 *      2026-07-05); 中文 is one toggle away and the cookie remembers it.
 *
 * Only runs on the root path. All other routes pass through.
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept the root path
  if (pathname !== "/") {
    return NextResponse.next();
  }

  // Honour explicit cookie preference; otherwise default to English.
  const langCookie = request.cookies.get("lang")?.value;
  const locale = langCookie === "zh" ? "zh" : "en";
  return NextResponse.redirect(new URL(`/${locale}`, request.url), 307);
}

export const config = {
  matcher: ["/"],
};
