"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { relTime } from "@/lib/dashboard-format";
import { WARROOM_CHANNEL, dmChannel } from "@/lib/chat";
import { ALL_PEOPLE } from "@/lib/people";
import type { ChatMessage } from "@/lib/dashboard-types";

const RECENT_LIMIT = 20;

// Mag maar één keer gemount worden (layout.tsx, niet in NavLinks -- die zit
// dubbel in de DOM voor de sidebar/topbar-varianten) -- anders vuurt elke
// binnenkomende chat twee keer een bureaubladmelding af.
export function NotificationBell({ me }: { me: string }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<ChatMessage[]>([]);
  const [readMap, setReadMap] = useState<Record<string, string>>({});
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!me) return;
    const myChannels = [WARROOM_CHANNEL, ...ALL_PEOPLE.filter((p) => p.id !== me).map((p) => dmChannel(me, p.id))];

    async function refresh() {
      const [{ data: messages }, { data: reads }] = await Promise.all([
        supabaseBrowser.from("chat_messages").select("*").in("channel", myChannels).neq("sender", me).order("created_at", { ascending: false }).limit(RECENT_LIMIT),
        supabaseBrowser.from("chat_reads").select("channel, last_read_at").eq("person", me),
      ]);
      setRecent((messages ?? []) as ChatMessage[]);
      setReadMap(Object.fromEntries((reads ?? []).map((r) => [r.channel, r.last_read_at])));
    }
    refresh();

    const channel = supabaseBrowser
      .channel("flowsys-notification-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads" }, refresh)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [me]);

  useEffect(() => {
    if (!me || permission !== "granted") return;
    const myChannels = new Set([WARROOM_CHANNEL, ...ALL_PEOPLE.filter((p) => p.id !== me).map((p) => dmChannel(me, p.id))]);
    const channel = supabaseBrowser
      .channel("flowsys-chat-desktop-notify")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg.sender === me || !myChannels.has(msg.channel)) return;
        const senderName = PEOPLE_NAME[msg.sender] ?? msg.sender;
        const body = msg.media_type === "image" ? "📷 stuurde een foto" : msg.media_type === "video" ? "🎥 stuurde een video" : msg.content;
        const title = msg.channel === WARROOM_CHANNEL ? `${senderName} in War Room` : senderName;
        const n = new Notification(title, { body });
        n.onclick = () => { window.focus(); window.location.href = `/chat?channel=${encodeURIComponent(msg.channel)}`; };
      })
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [me, permission]);

  const unreadCount = recent.filter((m) => !readMap[m.channel] || m.created_at > readMap[m.channel]).length;

  function channelLabel(ch: string) {
    if (ch === WARROOM_CHANNEL) return "War Room";
    const parts = ch.split("__");
    const otherId = parts.find((p) => p !== me) ?? ch;
    return PEOPLE_NAME[otherId] ?? otherId;
  }

  return (
    <div className="notif-bell" ref={boxRef}>
      <button className="icon-btn" onClick={() => setOpen((v) => !v)} aria-label="Meldingen" title="Meldingen">
        🔔
        {unreadCount > 0 && <span className="chat-unread-dot notif-bell-dot">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-head">
            Meldingen
            {permission === "default" && (
              <button className="btn ghost" style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 11.5 }} onClick={() => Notification.requestPermission().then(setPermission)}>
                Bureaubladmeldingen aan
              </button>
            )}
          </div>
          <div className="notif-dropdown-list">
            {recent.length === 0 && <div className="col-empty">Nog geen berichten.</div>}
            {recent.map((m) => {
              const unread = !readMap[m.channel] || m.created_at > readMap[m.channel];
              return (
                <a key={m.id} href={`/chat?channel=${encodeURIComponent(m.channel)}`} className={"notif-item" + (unread ? " unread" : "")} onClick={() => setOpen(false)}>
                  <div className="notif-item-head">
                    <span className="notif-item-sender">{PEOPLE_NAME[m.sender] ?? m.sender}</span>
                    <span className="notif-item-channel">{channelLabel(m.channel)}</span>
                  </div>
                  <div className="notif-item-body">
                    {m.media_type === "image" ? "📷 Foto" : m.media_type === "video" ? "🎥 Video" : m.content}
                  </div>
                  <div className="notif-item-time">{relTime(m.created_at)}</div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
