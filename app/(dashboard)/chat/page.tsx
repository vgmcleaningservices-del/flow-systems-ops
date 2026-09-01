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
  const { data: messages } = await db
    .from("chat_messages")
    .select("*")
    .in("channel", myChannels)
    .order("created_at", { ascending: true })
    .limit(500);

  return <ChatClient me={me} others={others} initialMessages={messages ?? []} />;
}
