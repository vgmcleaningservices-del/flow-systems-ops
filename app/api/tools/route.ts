import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getIdentity } from "@/lib/session";

export async function POST(req: NextRequest) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("tools").insert({
    name,
    category: body?.category || "overig",
    url: body?.url || null,
    cost: Number(body?.cost) || 0,
    billing_cycle: body?.billing_cycle || "maandelijks",
    renews_on: body?.renews_on || null,
    account_owner: body?.account_owner || null,
    notes: (body?.notes || "").trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
