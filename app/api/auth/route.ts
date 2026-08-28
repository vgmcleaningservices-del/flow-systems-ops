import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, makeSessionToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = body?.code;

  if (!code || code !== process.env.TEAM_ACCESS_CODE) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await makeSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
