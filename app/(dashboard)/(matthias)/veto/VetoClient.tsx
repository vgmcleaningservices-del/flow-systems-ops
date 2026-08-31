"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Directive, Venture } from "@/lib/dashboard-types";

export function VetoClient(props: { initialMeName: string; initialDirectives: Directive[]; initialVentures: Venture[] }) {
  const [directives, setDirectives] = useState(props.initialDirectives);
  const [ventures] = useState(props.initialVentures);
  const [directiveText, setDirectiveText] = useState("");
  // Lokaal aan deze pagina -- vervangt de oude paginabrede venture-selector die
  // bepaalde op welke venture een directive/veto gericht werd.
  const [targetVentureId, setTargetVentureId] = useState<string | null>(null);
  const meName = props.initialMeName;

  useEffect(() => {
    const refetch = () => supabaseBrowser.from("directives").select("*").order("ts", { ascending: false }).limit(12).then(({ data }) => data && setDirectives(data as Directive[]));
    const channel = supabaseBrowser
      .channel("flowsys-veto")
      .on("postgres_changes", { event: "*", schema: "public", table: "directives" }, refetch)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  const ventureName = (id: string | null) => (id ? ventures.find((v) => v.id === id)?.name ?? id : null);
  const targetVenture = targetVentureId ? ventures.find((v) => v.id === targetVentureId) ?? null : null;

  async function deploy() {
    const text = directiveText.trim();
    if (!text) return;
    await post("/api/directive", { author: meName, text, venture_id: targetVentureId });
    setDirectiveText("");
  }

  return (
    <>
      <div className="section-head"><span className="section-title">VETO Console</span></div>
      <p className="section-sub">Matthias — rank 1, veto-macht{targetVenture ? ` — gericht op ${targetVenture.name}` : " — algemeen"}</p>
      <div className="form-inline" style={{ marginBottom: 12 }}>
        <select value={targetVentureId ?? ""} onChange={(e) => setTargetVentureId(e.target.value || null)}>
          <option value="">— algemeen —</option>
          {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="console">
        <div className="console-row">
          <span className="prompt-prefix">{meName.toUpperCase()}@FLOWSYS:~$</span>
          <input
            className="console-input"
            placeholder="Initeer override, VETO, of forceer [PASS] commando..."
            value={directiveText}
            onChange={(e) => setDirectiveText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") deploy(); }}
          />
          <button className="execute-btn" onClick={deploy}>Deploy Directive</button>
        </div>
        <div className="log">
          {directives.length === 0 && <div className="log-empty">Geen directives uitgegeven.</div>}
          {directives.map((d) => (
            <div className={"log-line " + d.type} key={d.id}>
              <span className="ts">[{new Date(d.ts).toLocaleTimeString("nl-BE")}]</span> {d.type === "veto" ? "VETO" : "DIRECTIVE"} — {d.text} <span style={{ color: "var(--text-faint)" }}>({d.author}{d.venture_id ? `, ${ventureName(d.venture_id)}` : ""})</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
