import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = supabaseAdmin();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.mrr === "number") {
    const { data: current } = await db.from("telemetry").select("mrr").eq("id", 1).single();
    update.mrr_prev = current?.mrr ?? body.mrr;
    update.mrr = body.mrr;
  }
  if (body.resetSprintHours) {
    update.sprint_deadline = new Date(Date.now() + Number(body.resetSprintHours) * 3600 * 1000).toISOString();
    if (typeof body.sprintLabel === "string") update.sprint_label = body.sprintLabel;
  }

  const { error } = await db.from("telemetry").update(update).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
