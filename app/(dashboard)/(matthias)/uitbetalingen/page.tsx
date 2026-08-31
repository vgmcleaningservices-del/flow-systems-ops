import { supabaseAdmin } from "@/lib/supabaseServer";
import { getMe } from "@/lib/auth";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { UitbetalingenClient } from "./UitbetalingenClient";

export const dynamic = "force-dynamic";

export default async function UitbetalingenPage() {
  const me = await getMe();
  const meName = me ? (PEOPLE_NAME[me] ?? me) : "";
  const db = supabaseAdmin();
  const [{ data: ventures }, { data: crew }, { data: payouts }] = await Promise.all([
    db.from("ventures").select("*"),
    db.from("crew").select("*").order("rank", { ascending: true }),
    db.from("payouts").select("*").order("paid_at", { ascending: false }).limit(50),
  ]);
  return <UitbetalingenClient initialMeName={meName} initialVentures={ventures ?? []} initialCrew={crew ?? []} initialPayouts={payouts ?? []} />;
}
