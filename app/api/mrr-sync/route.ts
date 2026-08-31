import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { COOKIE_NAME, isValidSessionToken } from "@/lib/session";

export const runtime = "nodejs";

// Two ways in: Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`
// (Vercel attaches that header automatically for scheduled invocations), or a
// logged-in team member triggers it by hand from the dashboard using their
// session cookie.
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return isValidSessionToken(req.cookies.get(COOKIE_NAME)?.value);
}

async function sync() {
  const reportSecret = process.env.MRR_REPORT_SECRET;
  const db = supabaseAdmin();
  const { data: syncable } = await db
    .from("ventures")
    .select("id, mrr, mrr_source_url")
    .not("mrr_source_url", "is", null);

  const results: { id: string; mrr?: number; error?: string }[] = [];
  for (const v of syncable ?? []) {
    try {
      const res = await fetch(v.mrr_source_url as string, {
        headers: { Authorization: `Bearer ${reportSecret}` },
        cache: "no-store",
      });
      if (!res.ok) {
        results.push({ id: v.id, error: `http_${res.status}` });
        continue;
      }
      const body = await res.json();
      const newMrr = Math.round(Number(body.mrr));
      if (!Number.isFinite(newMrr)) {
        results.push({ id: v.id, error: "invalid_mrr" });
        continue;
      }
      await db
        .from("ventures")
        .update({
          mrr_prev: v.mrr,
          mrr: newMrr,
          mrr_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", v.id);
      results.push({ id: v.id, mrr: newMrr });
    } catch (err) {
      results.push({ id: v.id, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  // Dagelijks snapshot voor ÁLLE ventures (niet enkel de live-Stripe-gesyncte) --
  // dit is de enige plek die de omzetgrafiek van dagelijkse datapunten voorziet
  // voor ventures waar Matthias de MRR gewoon handmatig bijhoudt.
  const { data: allVentures } = await db.from("ventures").select("id, mrr");
  if (allVentures?.length) {
    await db.from("mrr_snapshots").insert(allVentures.map((v) => ({ venture_id: v.id, mrr: v.mrr })));
  }

  return results;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await sync();
  return NextResponse.json({ ok: true, results });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
