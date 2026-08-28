import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

// This only RECORDS that a payout happened (for the owed-vs-paid ledger).
// It never moves money and never talks to a payment provider.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const crewId = body?.crew_id;
  const amount = Number(body?.amount);
  const recordedBy = (body?.recorded_by || "").trim();

  if (!crewId || !recordedBy || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("payouts").insert({
    crew_id: crewId,
    venture_id: body.venture_id || null,
    amount,
    note: body.note || null,
    recorded_by: recordedBy,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
