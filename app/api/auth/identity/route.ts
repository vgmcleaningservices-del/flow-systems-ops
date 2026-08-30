import { NextRequest, NextResponse } from "next/server";
import { IDENTITY_COOKIE_NAME, makeIdentityToken } from "@/lib/session";
import { ALL_PEOPLE } from "@/lib/people";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const crewId = (body?.crew_id || "").toLowerCase();
  const code = body?.code;

  const known = ALL_PEOPLE.some((p) => p.id === crewId);
  const expected = process.env[`CREW_CODE_${crewId.toUpperCase()}`];
  if (!known || !expected || !code || code !== expected) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(IDENTITY_COOKIE_NAME, await makeIdentityToken(crewId), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
