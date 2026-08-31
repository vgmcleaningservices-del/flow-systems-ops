import { supabaseAdmin } from "@/lib/supabaseServer";
import { getMe, isMatthias } from "@/lib/auth";
import { OverviewClient } from "./OverviewClient";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const me = await getMe();
  const matthias = isMatthias(me);
  const db = supabaseAdmin();

  if (matthias) {
    const [
      { data: ventures }, { data: crew }, { data: tasks }, { data: tools },
      { data: lastCommit }, { data: lastDirective },
    ] = await Promise.all([
      db.from("ventures").select("*"),
      db.from("crew").select("*").order("rank", { ascending: true }),
      db.from("tasks").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("tools").select("*").order("name", { ascending: true }),
      db.from("commits").select("ts").order("ts", { ascending: false }).limit(1),
      db.from("directives").select("ts").order("ts", { ascending: false }).limit(1),
    ]);
    const lastActivityIso = [lastDirective?.[0]?.ts, lastCommit?.[0]?.ts].filter(Boolean).sort().reverse()[0] ?? null;
    return (
      <OverviewClient
        variant="matthias"
        initialVentures={ventures ?? []} initialCrew={crew ?? []} initialTasks={tasks ?? []} initialTools={tools ?? []}
        lastActivityIso={lastActivityIso}
      />
    );
  }

  const [{ data: tasks }, { data: crew }, { data: wikiPages }, { data: ventures }] = await Promise.all([
    db.from("tasks").select("*").eq("assigned_to", me ?? "").order("created_at", { ascending: false }),
    db.from("crew").select("*").order("rank", { ascending: true }),
    db.from("wiki_pages").select("*").order("updated_at", { ascending: false }).limit(3),
    db.from("ventures").select("*"),
  ]);
  return (
    <OverviewClient
      variant="team" me={me ?? ""}
      initialTasks={tasks ?? []} initialCrew={crew ?? []} initialWikiPages={wikiPages ?? []} initialVentures={ventures ?? []}
    />
  );
}
