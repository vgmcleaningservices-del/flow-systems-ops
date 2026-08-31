import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getIdentity } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.category === "string") update.category = body.category;
  if (typeof body.url === "string") update.url = body.url || null;
  if (body.cost !== undefined) update.cost = Number(body.cost) || 0;
  if (typeof body.billing_cycle === "string") update.billing_cycle = body.billing_cycle;
  if (typeof body.renews_on === "string" || body.renews_on === null) update.renews_on = body.renews_on || null;
  if (typeof body.account_owner === "string") update.account_owner = body.account_owner || null;
  if (typeof body.notes === "string") update.notes = body.notes;
  if (typeof body.status === "string") update.status = body.status;

  const db = supabaseAdmin();
  const { error } = await db.from("tools").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db.from("tools").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
