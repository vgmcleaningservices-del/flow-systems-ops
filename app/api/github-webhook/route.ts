import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseServer";

const PASS_RE = /\[PASS:([A-Z0-9_]+)\]/i;

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const digest = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  if (event !== "push") {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const payload = JSON.parse(rawBody);
  const repo: string = payload?.repository?.name ?? "unknown-repo";
  const commits: any[] = payload?.commits ?? [];
  if (commits.length === 0) return NextResponse.json({ ok: true, processed: 0 });

  const db = supabaseAdmin();
  const [{ data: crewRows }, { data: ventureRows }] = await Promise.all([
    db.from("crew").select("*"),
    db.from("ventures").select("*"),
  ]);
  const crew = crewRows ?? [];
  const ventures = ventureRows ?? [];

  const venture = ventures.find((v) => (v.github_repo || "").toLowerCase() === repo.toLowerCase());
  const ventureId = venture?.id ?? null;

  const findByGithub = (login: string | undefined | null) =>
    login ? crew.find((c) => (c.github_username || "").toLowerCase() === login.toLowerCase()) : undefined;
  const findByPassTarget = (name: string) => crew.find((c) => c.name.toLowerCase() === name.toLowerCase());

  async function logEvent(crewId: string, fromStatus: string | null, toStatus: string) {
    await db.from("crew_events").insert({ crew_id: crewId, venture_id: ventureId, from_status: fromStatus, to_status: toStatus, source: "webhook" });
  }

  for (const commit of commits) {
    const message: string = commit.message || "";
    const match = message.match(PASS_RE);
    const passTo = match ? match[1] : null;
    const authorLogin: string | undefined = commit.author?.username;
    const authorName: string = commit.author?.name || authorLogin || "onbekend";
    const ts = commit.timestamp || new Date().toISOString();
    const pusher = findByGithub(authorLogin);
    const target = passTo ? findByPassTarget(passTo) : undefined;

    await db.from("commits").insert({ repo, venture_id: ventureId, crew_id: pusher?.id ?? null, sha: commit.id, message, author: authorName, pass_to: passTo, ts });

    if (target) {
      await db.from("crew").update({ status: "waiting" }).eq("status", "bottleneck");
      await db
        .from("crew")
        .update({
          status: "bottleneck",
          task: `Ontving PASS via commit: ${message.replace(PASS_RE, "").trim()}`,
          current_venture_id: ventureId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", target.id);
      await logEvent(target.id, target.status, "bottleneck");

      if (pusher && pusher.id !== target.id) {
        await db
          .from("crew")
          .update({
            status: "waiting",
            note: `PASS doorgegeven aan ${target.name} — ${new Date(ts).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pusher.id);
        await logEvent(pusher.id, pusher.status, "waiting");
      }
    } else if (pusher) {
      await db
        .from("crew")
        .update({ status: "active", task: message, current_venture_id: ventureId ?? pusher.current_venture_id, updated_at: new Date().toISOString() })
        .eq("id", pusher.id);
      await logEvent(pusher.id, pusher.status, "active");
    }
  }

  return NextResponse.json({ ok: true, processed: commits.length, venture: ventureId });
}
