import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const db = supabaseAdmin();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === "string") update.status = body.status;
  if (typeof body.task === "string") update.task = body.task;
  if (typeof body.note === "string") update.note = body.note;
  if (typeof body.github_username === "string") update.github_username = body.github_username || null;

  if (body.status === "bottleneck") {
    await db.from("crew").update({ status: "waiting" }).eq("status", "bottleneck").neq("id", body.id);
  }

  const { error } = await db.from("crew").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
