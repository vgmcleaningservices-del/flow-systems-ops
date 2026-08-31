import { supabaseAdmin } from "@/lib/supabaseServer";
import { SquadClient } from "./SquadClient";

export const dynamic = "force-dynamic";

export default async function SquadPage() {
  const db = supabaseAdmin();
  const [{ data: crew }, { data: ventures }, { data: commits }] = await Promise.all([
    db.from("crew").select("*").order("rank", { ascending: true }),
    db.from("ventures").select("*"),
    db.from("commits").select("*").order("ts", { ascending: false }).limit(200),
  ]);
  return <SquadClient initialCrew={crew ?? []} initialVentures={ventures ?? []} initialCommits={commits ?? []} />;
}
