import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ALL_PEOPLE } from "@/lib/people";
import { WARROOM_CHANNEL, dmChannel } from "@/lib/chat";
import { HerinneringenClient } from "./HerinneringenClient";

export const dynamic = "force-dynamic";

export default async function HerinneringenPage() {
  const me = (await getMe()) ?? "";
  const others = ALL_PEOPLE.filter((p) => p.id !== me);
  const myChannels = [WARROOM_CHANNEL, ...others.map((p) => dmChannel(me, p.id))];

  const db = supabaseAdmin();
  const { data: media } = await db
    .from("chat_messages")
    .select("*")
    .in("channel", myChannels)
    .in("media_type", ["image", "video"])
    .order("created_at", { ascending: false })
    .limit(500);

  return <HerinneringenClient me={me} others={others} initialMedia={media ?? []} />;
}
