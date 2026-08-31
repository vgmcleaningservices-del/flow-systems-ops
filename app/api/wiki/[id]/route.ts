import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getIdentity } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: identity };
  if (typeof body.title === "string") update.title = body.title.trim();
  if (typeof body.content === "string") update.content = body.content;
  // "venture_id" mag legitiem als null gestuurd worden (algemeen maken) -- check
  // op aanwezigheid van de key, niet het type, zodat wissen niet stil genegeerd wordt.
  if ("venture_id" in body) update.venture_id = body.venture_id || null;

  const db = supabaseAdmin();
  const { error } = await db.from("wiki_pages").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db.from("wiki_pages").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
