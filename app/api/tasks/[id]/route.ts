import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getIdentity } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: existing } = await db.from("tasks").select("assigned_to").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") update.title = body.title.trim();
  if (typeof body.description === "string") update.description = body.description;
  if (typeof body.status === "string") update.status = body.status;

  // Een nieuwe assignee kiezen IS de doorstuur-actie -- geen aparte knop nodig.
  // handed_off_by komt uit de geverifieerde identiteit van wie op "Opslaan"
  // klikt, nooit uit een claim in de request-body.
  if (typeof body.assigned_to === "string" && body.assigned_to !== existing.assigned_to) {
    update.assigned_to = body.assigned_to;
    update.handed_off_by = identity;
    update.handed_off_at = new Date().toISOString();
    if (typeof body.status !== "string") update.status = "handed_off";
  }

  const { error } = await db.from("tasks").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
