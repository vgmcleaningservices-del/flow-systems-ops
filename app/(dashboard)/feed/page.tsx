import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { WARROOM_CHANNEL } from "@/lib/chat";
import { FeedClient } from "./FeedClient";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const me = (await getMe()) ?? "";
  const db = supabaseAdmin();
  const [{ data: posts }, { data: likes }] = await Promise.all([
    db.from("chat_messages").select("*").eq("channel", WARROOM_CHANNEL).in("media_type", ["image", "video"]).order("created_at", { ascending: false }).limit(200),
    db.from("chat_message_likes").select("*"),
  ]);

  return <FeedClient me={me} initialPosts={posts ?? []} initialLikes={likes ?? []} />;
}
