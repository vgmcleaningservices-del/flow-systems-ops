import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ALL_PEOPLE } from "@/lib/people";
import { HerinneringenClient } from "./HerinneringenClient";

export const dynamic = "force-dynamic";

export default async function HerinneringenPage() {
  const me = (await getMe()) ?? "";
  const others = ALL_PEOPLE.filter((p) => p.id !== me);

  const db = supabaseAdmin();
  // Alleen wat ikzelf verstuurd heb -- dit is mijn eigen "gemaakte" archief,
  // geen dump van alles wat anderen mij toesturen.
  const { data: media } = await db
    .from("chat_messages")
    .select("*")
    .eq("sender", me)
    .in("media_type", ["image", "video"])
    .order("created_at", { ascending: false })
    .limit(500);

  return <HerinneringenClient me={me} others={others} initialMedia={media ?? []} />;
}
