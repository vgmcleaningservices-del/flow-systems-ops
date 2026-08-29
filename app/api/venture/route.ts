import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const db = supabaseAdmin();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.stage === "string") update.stage = body.stage;
  if (typeof body.price === "string") update.price = body.price;
  if (typeof body.feature === "string") update.feature = body.feature;
  if (typeof body.repo_done === "boolean") update.repo_done = body.repo_done;
  if (typeof body.domein_done === "boolean") update.domein_done = body.domein_done;
  if (typeof body.stripe_done === "boolean") update.stripe_done = body.stripe_done;
  // These may legitimately be sent as null (clearing them) — check for the key,
  // not the type, so clearing isn't silently dropped.
  if ("github_repo" in body) update.github_repo = body.github_repo || null;
  if ("pitched_by" in body) update.pitched_by = body.pitched_by || null;
  if ("mrr_source_url" in body) update.mrr_source_url = body.mrr_source_url || null;
  if ("notion_url" in body) update.notion_url = body.notion_url || null;

  if (typeof body.mrr === "number") {
    const { data: current } = await db.from("ventures").select("mrr").eq("id", body.id).single();
    update.mrr_prev = current?.mrr ?? body.mrr;
    update.mrr = body.mrr;
  }
  if (body.resetSprintHours) {
    update.sprint_deadline = new Date(Date.now() + Number(body.resetSprintHours) * 3600 * 1000).toISOString();
    if (typeof body.sprintLabel === "string") update.sprint_label = body.sprintLabel;
  }

  const { error } = await db.from("ventures").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
