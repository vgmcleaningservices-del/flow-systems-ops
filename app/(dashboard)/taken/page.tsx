import { supabaseAdmin } from "@/lib/supabaseServer";
import { getMe } from "@/lib/auth";
import { TakenClient } from "./TakenClient";

export const dynamic = "force-dynamic";

export default async function TakenPage() {
  const me = await getMe();
  const db = supabaseAdmin();
  const [{ data: tasks }, { data: crew }, { data: ventures }] = await Promise.all([
    db.from("tasks").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("crew").select("*").order("rank", { ascending: true }),
    db.from("ventures").select("*"),
  ]);
  return <TakenClient initialMe={me ?? ""} initialTasks={tasks ?? []} initialCrew={crew ?? []} initialVentures={ventures ?? []} />;
}
