import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = (body?.text || "").trim();
  const author = (body?.author || "").trim();
  if (!text || !author) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const isVeto = /^veto\b/i.test(text);
  const db = supabaseAdmin();
  const { error } = await db.from("directives").insert({
    author,
    type: isVeto ? "veto" : "directive",
    text,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
