import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

// personel rolünün erişebileceği sayfalar
const PERSONEL_ALLOWED_PATHS = ["/giris-kontrol"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function isAllowedForPersonel(pathname: string): boolean {
  return PERSONEL_ALLOWED_PATHS.some((path) => pathname.startsWith(path));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const staticPaths = ["/sw.js", "/workbox-", "/icons/", "/manifest.json", "/offline", "/favicon.ico"];
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    staticPaths.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  try {
    const cookieName = process.env.COOKIE_NAME || "opsdesk_session";
    const sessionCookie = request.cookies.get(cookieName);
    const sessionId = sessionCookie?.value || null;
    const isLogin = isPublicPath(pathname);

    if (!sessionId && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (sessionId && isLogin) {
      const role = request.cookies.get("opsdesk_role")?.value || "";
      const url = request.nextUrl.clone();
      url.pathname = role === "personel" ? "/giris-kontrol" : "/";
      return NextResponse.redirect(url);
    }

    // personel rolü sadece /giris-kontrol'e erişebilir
    const role = request.cookies.get("opsdesk_role")?.value || "";
    if (role === "personel" && !isAllowedForPersonel(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/giris-kontrol";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // Hata durumunda login sayfasına yönlendir
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};