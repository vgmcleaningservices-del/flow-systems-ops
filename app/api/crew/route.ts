import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: existing } = await db.from("crew").select("status").eq("id", body.id).single();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === "string") update.status = body.status;
  if (typeof body.task === "string") update.task = body.task;
  if (typeof body.note === "string") update.note = body.note;
  if (typeof body.github_username === "string") update.github_username = body.github_username || null;
  // current_venture_id may legitimately be sent as null (unassigning someone) — only
  // "not present at all" should leave it untouched, so check for the key, not the type.
  if ("current_venture_id" in body) update.current_venture_id = body.current_venture_id || null;

  if (body.status === "bottleneck") {
    await db.from("crew").update({ status: "waiting" }).eq("status", "bottleneck").neq("id", body.id);
  }

  const { error } = await db.from("crew").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (typeof body.status === "string" && existing && existing.status !== body.status) {
    await db.from("crew_events").insert({
      crew_id: body.id,
      venture_id: "current_venture_id" in body ? body.current_venture_id || null : null,
      from_status: existing.status,
      to_status: body.status,
      source: "manual",
    });
  }

  return NextResponse.json({ ok: true });
}
