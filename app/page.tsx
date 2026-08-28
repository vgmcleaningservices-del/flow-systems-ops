import { supabaseAdmin } from "@/lib/supabaseServer";
import Dashboard from "./components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = supabaseAdmin();
  const [
    { data: crew },
    { data: ventures },
    { data: commits },
    { data: directives },
    { data: crewEvents },
    { data: metrics },
    { data: payouts },
  ] = await Promise.all([
    db.from("crew").select("*").order("rank", { ascending: true }),
    db.from("ventures").select("*"),
    db.from("commits").select("*").order("ts", { ascending: false }).limit(200),
    db.from("directives").select("*").order("ts", { ascending: false }).limit(12),
    db.from("crew_events").select("*").order("ts", { ascending: false }).limit(200),
    db.from("metrics").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("payouts").select("*").order("paid_at", { ascending: false }).limit(50),
  ]);

  return (
    <Dashboard
      initialCrew={crew ?? []}
      initialVentures={ventures ?? []}
      initialCommits={commits ?? []}
      initialDirectives={directives ?? []}
      initialCrewEvents={crewEvents ?? []}
      initialMetrics={metrics ?? []}
      initialPayouts={payouts ?? []}
    />
  );
}
