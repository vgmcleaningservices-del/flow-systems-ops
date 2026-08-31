import { supabaseAdmin } from "@/lib/supabaseServer";
import { getMe } from "@/lib/auth";
import { WikiClient } from "./WikiClient";

export const dynamic = "force-dynamic";

export default async function WikiPage() {
  const me = await getMe();
  const db = supabaseAdmin();
  const [{ data: wikiPages }, { data: ventures }] = await Promise.all([
    db.from("wiki_pages").select("*").order("updated_at", { ascending: false }),
    db.from("ventures").select("*"),
  ]);

  return <WikiClient initialMe={me ?? ""} initialWikiPages={wikiPages ?? []} initialVentures={ventures ?? []} />;
}
