import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, IDENTITY_COOKIE_NAME, isValidSessionToken, verifyIdentityToken } from "./lib/session";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/github-webhook", "/api/mrr-sync"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const identityToken = req.cookies.get(IDENTITY_COOKIE_NAME)?.value;
  const validTeam = await isValidSessionToken(token);
  const crewId = validTeam ? await verifyIdentityToken(identityToken) : null;
  if (validTeam && crewId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
