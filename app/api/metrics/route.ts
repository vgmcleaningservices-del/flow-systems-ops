import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const crewId = body?.crew_id;
  const label = (body?.label || "").trim();
  const value = Number(body?.value);
  const period = (body?.period || "").trim();

  if (!crewId || !label || !period || Number.isNaN(value)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("metrics").insert({
    crew_id: crewId,
    venture_id: body.venture_id || null,
    label,
    value,
    period,
    note: body.note || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
