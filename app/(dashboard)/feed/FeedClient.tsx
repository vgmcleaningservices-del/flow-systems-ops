"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { ChatMessage, ChatMessageLike } from "@/lib/dashboard-types";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { relTime } from "@/lib/dashboard-format";
import { WARROOM_CHANNEL } from "@/lib/chat";

export function FeedClient(props: { me: string; initialPosts: ChatMessage[]; initialLikes: ChatMessageLike[] }) {
  const { me } = props;
  const [posts, setPosts] = useState(props.initialPosts);
  const [likes, setLikes] = useState(props.initialLikes);

  useEffect(() => {
    const refetchPosts = () =>
      supabaseBrowser
        .from("chat_messages")
        .select("*")
        .eq("channel", WARROOM_CHANNEL)
        .in("media_type", ["image", "video"])
        .order("created_at", { ascending: false })
        .limit(200)
        .then(({ data }) => data && setPosts(data as ChatMessage[]));
    const refetchLikes = () =>
      supabaseBrowser.from("chat_message_likes").select("*").then(({ data }) => data && setLikes(data as ChatMessageLike[]));
    const channel = supabaseBrowser
      .channel("flowsys-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, refetchPosts)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_message_likes" }, refetchLikes)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  const likesByPost = useMemo(() => {
    const map = new Map<number, ChatMessageLike[]>();
    for (const l of likes) {
      if (!map.has(l.message_id)) map.set(l.message_id, []);
      map.get(l.message_id)!.push(l);
    }
    return map;
  }, [likes]);

  async function toggleLike(messageId: number) {
    const mine = likesByPost.get(messageId)?.some((l) => l.person === me);
    setLikes((prev) =>
      mine
        ? prev.filter((l) => !(l.message_id === messageId && l.person === me))
        : [...prev, { message_id: messageId, person: me, liked_at: new Date().toISOString() }]
    );
    await post("/api/chat/like", { message_id: messageId });
  }

  return (
    <>
      <div className="section-head"><span className="section-title">Feed</span></div>
      <p className="section-sub">Alle foto's en video's uit War Room, op een rij</p>

      {posts.length === 0 && <div className="col-empty">Nog geen posts in War Room.</div>}

      <div className="feed">
        {posts.map((p) => {
          const postLikes = likesByPost.get(p.id) ?? [];
          const mine = postLikes.some((l) => l.person === me);
          const senderName = PEOPLE_NAME[p.sender] ?? p.sender;
          return (
            <div className="feed-post" key={p.id}>
              <div className="feed-post-head">
                <span className="avatar avatar-md">{senderName[0]?.toUpperCase()}</span>
                <span className="feed-post-name">{senderName}</span>
                <span className="feed-post-time">{relTime(p.created_at)}</span>
              </div>
              {p.media_type === "image" ? (
                <img className="feed-post-media" src={p.media_url!} alt="" onClick={() => window.open(p.media_url!, "_blank")} />
              ) : (
                <video className="feed-post-media" src={p.media_url!} controls onClick={() => window.open(p.media_url!, "_blank")} />
              )}
              <div className="feed-post-actions">
                <button
                  className={"feed-like-btn" + (mine ? " liked" : "")}
                  onClick={() => toggleLike(p.id)}
                  aria-label={mine ? "Vind ik niet meer leuk" : "Vind ik leuk"}
                >
                  {mine ? "♥" : "♡"}
                </button>
              </div>
              {postLikes.length > 0 && (
                <div className="feed-like-count">
                  {postLikes.length === 1
                    ? `${PEOPLE_NAME[postLikes[0].person] ?? postLikes[0].person} vindt dit leuk`
                    : `${postLikes.length} keer leuk gevonden`}
                </div>
              )}
              {p.content && (
                <div className="feed-post-caption">
                  <b>{senderName}</b>{p.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
