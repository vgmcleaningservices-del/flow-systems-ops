import { supabaseAdmin } from "@/lib/supabaseServer";
import { getMe } from "@/lib/auth";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { VetoClient } from "./VetoClient";

export const dynamic = "force-dynamic";

export default async function VetoPage() {
  const me = await getMe();
  const meName = me ? (PEOPLE_NAME[me] ?? me) : "";
  const db = supabaseAdmin();
  const [{ data: directives }, { data: ventures }] = await Promise.all([
    db.from("directives").select("*").order("ts", { ascending: false }).limit(12),
    db.from("ventures").select("*"),
  ]);
  return <VetoClient initialMeName={meName} initialDirectives={directives ?? []} initialVentures={ventures ?? []} />;
}
