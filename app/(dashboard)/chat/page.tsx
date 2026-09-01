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
  const [{ data: messages }, { data: reads }, { data: crew }, { data: ventures }] = await Promise.all([
    db.from("chat_messages").select("*").in("channel", myChannels).order("created_at", { ascending: true }).limit(500),
    // Alle leesregels van iedereen in mijn kanalen (niet alleen die van mezelf)
    // -- nodig om leesbevestigingen op mijn eigen verzonden berichten te tonen.
    db.from("chat_reads").select("*").in("channel", myChannels),
    db.from("crew").select("*").order("rank", { ascending: true }),
    db.from("ventures").select("*"),
  ]);

  return (
    <ChatClient
      me={me} others={others}
      initialMessages={messages ?? []} initialReads={reads ?? []}
      crew={crew ?? []} ventures={ventures ?? []}
    />
  );
}
