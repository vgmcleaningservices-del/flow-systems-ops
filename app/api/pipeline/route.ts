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

  const { error } = await db.from("pipeline").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
