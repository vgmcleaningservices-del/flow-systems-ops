"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { WARROOM_CHANNEL, dmChannel } from "@/lib/chat";
import { ALL_PEOPLE } from "@/lib/people";
import type { ChatMessage } from "@/lib/dashboard-types";

// Mag maar één keer gemount worden (layout.tsx, niet in NavLinks -- die zit
// dubbel in de DOM voor de sidebar/topbar-varianten) -- anders vuurt elke
// binnenkomende chat twee keer een meldingen af.
export function ChatNotifyButton({ me }: { me: string }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!me || permission !== "granted") return;
    const myChannels = new Set([WARROOM_CHANNEL, ...ALL_PEOPLE.filter((p) => p.id !== me).map((p) => dmChannel(me, p.id))]);
    const channel = supabaseBrowser
      .channel("flowsys-chat-notify")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg.sender === me || !myChannels.has(msg.channel)) return;
        const senderName = PEOPLE_NAME[msg.sender] ?? msg.sender;
        const body = msg.media_type === "image" ? "📷 stuurde een foto" : msg.media_type === "video" ? "🎥 stuurde een video" : msg.content;
        const title = msg.channel === WARROOM_CHANNEL ? `${senderName} in War Room` : senderName;
        const n = new Notification(title, { body });
        n.onclick = () => { window.focus(); window.location.href = "/chat"; };
      })
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [me, permission]);

  if (permission === "unsupported" || permission === "denied") return null;
  if (permission === "granted") return <span className="icon-btn" title="Chatmeldingen staan aan" aria-label="Chatmeldingen staan aan">🔔</span>;
  return (
    <button className="icon-btn" onClick={() => Notification.requestPermission().then(setPermission)} title="Chatmeldingen inschakelen" aria-label="Chatmeldingen inschakelen">
      🔕
    </button>
  );
}
