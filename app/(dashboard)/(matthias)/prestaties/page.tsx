import { supabaseAdmin } from "@/lib/supabaseServer";
import { PrestatiesClient } from "./PrestatiesClient";

export const dynamic = "force-dynamic";

export default async function PrestatiesPage() {
  const db = supabaseAdmin();
  const [{ data: crew }, { data: ventures }, { data: commits }, { data: crewEvents }, { data: metrics }] = await Promise.all([
    db.from("crew").select("*").order("rank", { ascending: true }),
    db.from("ventures").select("*"),
    db.from("commits").select("*").order("ts", { ascending: false }).limit(200),
    db.from("crew_events").select("*").order("ts", { ascending: false }).limit(200),
    db.from("metrics").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <PrestatiesClient
      initialCrew={crew ?? []} initialVentures={ventures ?? []}
      initialCommits={commits ?? []} initialCrewEvents={crewEvents ?? []} initialMetrics={metrics ?? []}
    />
  );
}
