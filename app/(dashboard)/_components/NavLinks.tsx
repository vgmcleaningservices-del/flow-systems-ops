"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup } from "motion/react";
import * as motion from "motion/react-client";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ALL_PEOPLE } from "@/lib/people";
import { WARROOM_CHANNEL, dmChannel } from "@/lib/chat";

const NAV_ITEMS = [
  { href: "/", label: "Overzicht" },
  { href: "/squad", label: "Squad Status" },
  { href: "/pipeline", label: "App Pipeline" },
  { href: "/programmas", label: "Programma's" },
  { href: "/taken", label: "Taken" },
  { href: "/wiki", label: "Wiki" },
  { href: "/chat", label: "Chat" },
  { href: "/herinneringen", label: "Herinneringen" },
];
const ADMIN_NAV_ITEMS = [
  { href: "/prestaties", label: "Prestaties" },
  { href: "/uitbetalingen", label: "Uitbetalingen" },
  { href: "/veto", label: "VETO Console" },
  { href: "/tools", label: "Tools & Abonnementen" },
];

// `scope` namespacet de layoutId van de actieve-pil binnen Motion's
// LayoutGroup -- nodig omdat Sidebar's NavLinks altijd gemount blijft
// (alleen CSS-verborgen onder 880px) terwijl TopNav's instantie daaronder
// juist wél zichtbaar is; zonder namespacing zouden beide dezelfde
// layoutId delen zodra ze tegelijk in de DOM staan.
// Totaal aantal ongelezen chatberichten voor deze persoon, over alle
// kanalen heen (War Room + elke 1-op-1) -- puur voor het badge-cijfer naast
// "Chat" in de nav, losstaand van wat de Chat-pagina zelf al bijhoudt.
function useTotalUnread(me: string, instanceId: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!me) return;
    const myChannels = [WARROOM_CHANNEL, ...ALL_PEOPLE.filter((p) => p.id !== me).map((p) => dmChannel(me, p.id))];
    async function refresh() {
      const [{ data: reads }, { data: messages }] = await Promise.all([
        supabaseBrowser.from("chat_reads").select("channel, last_read_at").eq("person", me),
        supabaseBrowser.from("chat_messages").select("channel, sender, created_at").in("channel", myChannels).neq("sender", me),
      ]);
      const readMap = Object.fromEntries((reads ?? []).map((r) => [r.channel, r.last_read_at]));
      const unread = (messages ?? []).filter((m) => !readMap[m.channel] || m.created_at > readMap[m.channel]).length;
      setCount(unread);
    }
    refresh();
    const channel = supabaseBrowser
      .channel(`flowsys-nav-unread-${instanceId.replace(/[^a-zA-Z0-9]/g, "")}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads" }, refresh)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [me, instanceId]);
  return count;
}

export function NavLinks({ isMatthias, me, onNavigate, scope, variant = "vertical" }: {
  isMatthias: boolean; me: string; onNavigate?: () => void; scope: string; variant?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const instanceId = useId();
  const unread = useTotalUnread(me, instanceId);
  const link = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link key={href} href={href} onClick={onNavigate} className={"nav-link" + (active ? " active" : "")}>
        {active && (
          <motion.span
            layoutId="nav-pill"
            className="nav-pill"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <span className="nav-link-label">{label}</span>
        {href === "/chat" && unread > 0 && <span className="chat-unread-dot">{unread}</span>}
      </Link>
    );
  };
  return (
    <LayoutGroup id={scope}>
      <nav className={variant === "horizontal" ? "topbar-nav" : "sidebar-nav"}>
        {NAV_ITEMS.map((i) => link(i.href, i.label))}
        {isMatthias && (
          variant === "horizontal" ? (
            <>
              <span className="topbar-divider" />
              {ADMIN_NAV_ITEMS.map((i) => link(i.href, i.label))}
            </>
          ) : (
            <>
              <div className="sidebar-section-label">Beheer</div>
              {ADMIN_NAV_ITEMS.map((i) => link(i.href, i.label))}
            </>
          )
        )}
        {link("/instellingen", "Instellingen")}
      </nav>
    </LayoutGroup>
  );
}
