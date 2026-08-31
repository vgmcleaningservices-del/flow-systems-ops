import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getIdentity } from "@/lib/session";

export async function POST(req: NextRequest) {
  // Middleware bewaakt dit pad al, maar created_by moet uit de geverifieerde
  // identiteit komen, nooit uit een door de client meegestuurd naamveld --
  // dat is precies het lek dat deze functie moet dichten.
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ventureId = body?.venture_id;
  const title = (body?.title || "").trim();
  const assignedTo = body?.assigned_to;
  if (!ventureId || !title || !assignedTo) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("tasks").insert({
    venture_id: ventureId,
    title,
    description: (body?.description || "").trim(),
    assigned_to: assignedTo,
    created_by: identity,
    priority: typeof body?.priority === "string" ? body.priority : "normal",
    due_date: body?.due_date || null,
    // Alleen bij aanmaken instelbaar -- niet in de update-route, om herouderen
    // (en dus mogelijke cirkels) uit te sluiten.
    parent_task_id: body?.parent_task_id ? Number(body.parent_task_id) : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
