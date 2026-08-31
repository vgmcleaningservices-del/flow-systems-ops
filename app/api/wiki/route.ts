import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getIdentity } from "@/lib/session";

export async function POST(req: NextRequest) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = (body?.title || "").trim();
  if (!title) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("wiki_pages").insert({
    venture_id: body?.venture_id || null,
    title,
    content: (body?.content || "").trim(),
    created_by: identity,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
