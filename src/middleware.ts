/**
 * Edge middleware — redirect / to the appropriate locale route.
 *
 * Priority:
 *   1. `lang` cookie (set by LangToggle on explicit user choice)
 *   2. Accept-Language header (zh* → /zh, anything else → /en)
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

  // 1. Honour explicit cookie preference
  const langCookie = request.cookies.get("lang")?.value;
  if (langCookie === "zh" || langCookie === "en") {
    return NextResponse.redirect(new URL(`/${langCookie}`, request.url), 307);
  }

  // 2. Detect from Accept-Language header
  const acceptLang = request.headers.get("accept-language") ?? "";
  // Take the first language tag and check if it starts with zh
  const primary = acceptLang.split(",")[0]?.trim() ?? "";
  const isZh = /^zh/i.test(primary);

  return NextResponse.redirect(
    new URL(isZh ? "/zh" : "/en", request.url),
    307
  );
}

export const config = {
  matcher: ["/"],
};
