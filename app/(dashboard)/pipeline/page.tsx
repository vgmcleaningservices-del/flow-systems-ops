import { supabaseAdmin } from "@/lib/supabaseServer";
import { PipelineClient } from "./PipelineClient";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const db = supabaseAdmin();
  const [{ data: ventures }, { data: crew }] = await Promise.all([
    db.from("ventures").select("*"),
    db.from("crew").select("*").order("rank", { ascending: true }),
  ]);
  return <PipelineClient initialVentures={ventures ?? []} initialCrew={crew ?? []} />;
}
