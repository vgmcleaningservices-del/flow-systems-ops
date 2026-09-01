"use client";
import { useEffect, useMemo, useState } from "react";
import * as motion from "motion/react-client";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { ChatMessage } from "@/lib/dashboard-types";
import { WARROOM_CHANNEL, dmChannel } from "@/lib/chat";
import { staggerContainerVariants, staggerItemVariants } from "../_components/motion";

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Vandaag";
  if (sameDay(d, yesterday)) return "Gisteren";
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
}

export function HerinneringenClient(props: { me: string; others: { id: string; name: string }[]; initialMedia: ChatMessage[] }) {
  const { me, others } = props;
  const [media, setMedia] = useState(props.initialMedia);

  const myChannels = useMemo(() => [WARROOM_CHANNEL, ...others.map((p) => dmChannel(me, p.id))], [me, others]);

  useEffect(() => {
    const refetch = () =>
      supabaseBrowser
        .from("chat_messages")
        .select("*")
        .in("channel", myChannels)
        .in("media_type", ["image", "video"])
        .order("created_at", { ascending: false })
        .limit(500)
        .then(({ data }) => data && setMedia(data as ChatMessage[]));
    const channel = supabaseBrowser
      .channel("flowsys-herinneringen")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, refetch)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [myChannels]);

  function channelLabel(ch: string) {
    if (ch === WARROOM_CHANNEL) return "War Room";
    const otherId = ch.split("__").find((p) => p !== me) ?? ch;
    return others.find((p) => p.id === otherId)?.name ?? otherId;
  }

  const groups = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const m of media) {
      const label = dateLabel(m.created_at);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(m);
    }
    return Array.from(map.entries());
  }, [media]);

  return (
    <>
      <div className="section-head"><span className="section-title">Herinneringen</span></div>
      <p className="section-sub">Al jouw foto's en video's uit War Room en je privégesprekken, permanent bewaard — je eigen archief, van niemand anders zichtbaar</p>

      {groups.length === 0 && <div className="col-empty">Nog geen foto's of video's gedeeld.</div>}

      {groups.map(([label, items]) => (
        <div key={label}>
          <div className="memories-date-label">{label}</div>
          <motion.div className="memories-grid" variants={staggerContainerVariants} initial="hidden" animate="show">
            {items.map((m) => (
              <motion.div className="memories-thumb" key={m.id} variants={staggerItemVariants} onClick={() => window.open(m.media_url!, "_blank")}>
                {m.media_type === "image" ? (
                  <img src={m.media_url!} alt="" />
                ) : (
                  <video src={m.media_url!} muted preload="metadata" />
                )}
                <span className="memories-thumb-badge">{channelLabel(m.channel)}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      ))}
    </>
  );
}
