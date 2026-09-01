"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { ChatMessage } from "@/lib/dashboard-types";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { relTime } from "@/lib/dashboard-format";
import { WARROOM_CHANNEL, dmChannel } from "@/lib/chat";

export function ChatClient(props: { me: string; others: { id: string; name: string }[]; initialMessages: ChatMessage[] }) {
  const { me, others } = props;
  const [messages, setMessages] = useState(props.initialMessages);
  const [activeChannel, setActiveChannel] = useState(WARROOM_CHANNEL);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const myChannels = useMemo(() => [WARROOM_CHANNEL, ...others.map((p) => dmChannel(me, p.id))], [me, others]);

  useEffect(() => {
    const refetch = () =>
      supabaseBrowser
        .from("chat_messages")
        .select("*")
        .in("channel", myChannels)
        .order("created_at", { ascending: true })
        .limit(500)
        .then(({ data }) => data && setMessages(data as ChatMessage[]));
    const channel = supabaseBrowser
      .channel("flowsys-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, refetch)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [myChannels]);

  const visible = messages.filter((m) => m.channel === activeChannel);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [visible.length, activeChannel]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    await post("/api/chat", { channel: activeChannel, content });
    setSending(false);
  }

  const activeLabel = activeChannel === WARROOM_CHANNEL ? "War Room" : PEOPLE_NAME[others.find((p) => dmChannel(me, p.id) === activeChannel)?.id ?? ""] ?? "Chat";

  return (
    <>
      <div className="section-head"><span className="section-title">Chat</span></div>
      <p className="section-sub">War Room voor iedereen, of een privégesprek met één teamlid</p>
      <div className="chat-layout">
        <div className="chat-sidebar">
          <button className={"chat-channel" + (activeChannel === WARROOM_CHANNEL ? " active" : "")} onClick={() => setActiveChannel(WARROOM_CHANNEL)}>
            🏛 War Room
          </button>
          <div className="chat-sidebar-label">Privé</div>
          {others.map((p) => (
            <button key={p.id} className={"chat-channel" + (activeChannel === dmChannel(me, p.id) ? " active" : "")} onClick={() => setActiveChannel(dmChannel(me, p.id))}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="chat-main">
          <div className="chat-main-head">{activeLabel}</div>
          <div className="chat-messages" ref={listRef}>
            {visible.length === 0 && <div className="col-empty">Nog geen berichten — stuur het eerste.</div>}
            {visible.map((m) => (
              <div className={"chat-bubble" + (m.sender === me ? " mine" : "")} key={m.id}>
                {m.sender !== me && <div className="chat-bubble-sender">{PEOPLE_NAME[m.sender] ?? m.sender}</div>}
                <div className="chat-bubble-content">{m.content}</div>
                <div className="chat-bubble-time">{relTime(m.created_at)}</div>
              </div>
            ))}
          </div>
          <div className="chat-composer">
            <input
              className="field"
              placeholder={`Bericht naar ${activeLabel}...`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
            <button className="btn primary" onClick={send} disabled={sending || !draft.trim()}>Stuur</button>
          </div>
        </div>
      </div>
    </>
  );
}
