import { supabaseAdmin } from "@/lib/supabaseServer";
import Dashboard from "./components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = supabaseAdmin();
  const [{ data: crew }, { data: pipeline }, { data: commits }, { data: directives }, { data: telemetryRows }] =
    await Promise.all([
      db.from("crew").select("*").order("rank", { ascending: true }),
      db.from("pipeline").select("*"),
      db.from("commits").select("*").order("ts", { ascending: false }).limit(6),
      db.from("directives").select("*").order("ts", { ascending: false }).limit(12),
      db.from("telemetry").select("*").eq("id", 1).limit(1),
    ]);

  return (
    <Dashboard
      initialCrew={crew ?? []}
      initialPipeline={pipeline ?? []}
      initialCommits={commits ?? []}
      initialDirectives={directives ?? []}
      initialTelemetry={telemetryRows?.[0] ?? null}
    />
  );
}
