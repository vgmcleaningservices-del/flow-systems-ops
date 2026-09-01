import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ALL_PEOPLE } from "@/lib/people";
import { WARROOM_CHANNEL, dmChannel } from "@/lib/chat";
import { ChatClient } from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const me = (await getMe()) ?? "";
  const others = ALL_PEOPLE.filter((p) => p.id !== me);
  const myChannels = [WARROOM_CHANNEL, ...others.map((p) => dmChannel(me, p.id))];

  const db = supabaseAdmin();
  const [{ data: messages }, { data: reads }, { data: views }, { data: crew }, { data: ventures }] = await Promise.all([
    db.from("chat_messages").select("*").in("channel", myChannels).order("created_at", { ascending: true }).limit(500),
    db.from("chat_reads").select("*").eq("person", me),
    db.from("chat_message_views").select("*").eq("viewer", me),
    db.from("crew").select("*").order("rank", { ascending: true }),
    db.from("ventures").select("*"),
  ]);

  return (
    <ChatClient
      me={me} others={others}
      initialMessages={messages ?? []} initialReads={reads ?? []} initialViews={views ?? []}
      crew={crew ?? []} ventures={ventures ?? []}
    />
  );
}
