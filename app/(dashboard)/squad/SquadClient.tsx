"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Crew, CrewStatus, CommitRow, Venture } from "@/lib/dashboard-types";
import { STATUS_LABEL, STATUS_TAG } from "@/lib/dashboard-constants";
import { CrewForm } from "./CrewForm";

export function SquadClient(props: { initialCrew: Crew[]; initialVentures: Venture[]; initialCommits: CommitRow[] }) {
  const [crew, setCrew] = useState(props.initialCrew);
  const [ventures, setVentures] = useState(props.initialVentures);
  const [commits, setCommits] = useState(props.initialCommits);
  const [editCrewId, setEditCrewId] = useState<string | null>(null);
  // Lokaal aan deze pagina -- de oude paginabrede venture-selector filterde
  // hier ook alleen de git-log, dus dat gedrag blijft behouden, alleen nu
  // gescopeerd tot Squad Status i.p.v. gedeeld met andere secties.
  const [logVentureId, setLogVentureId] = useState<string | null>(null);

  useEffect(() => {
    const refetchCrew = () => supabaseBrowser.from("crew").select("*").order("rank").then(({ data }) => data && setCrew(data as Crew[]));
    const refetchVentures = () => supabaseBrowser.from("ventures").select("*").then(({ data }) => data && setVentures(data as Venture[]));
    const refetchCommits = () => supabaseBrowser.from("commits").select("*").order("ts", { ascending: false }).limit(200).then(({ data }) => data && setCommits(data as CommitRow[]));
    const channel = supabaseBrowser
      .channel("flowsys-squad")
      .on("postgres_changes", { event: "*", schema: "public", table: "crew" }, refetchCrew)
      .on("postgres_changes", { event: "*", schema: "public", table: "ventures" }, refetchVentures)
      .on("postgres_changes", { event: "*", schema: "public", table: "commits" }, refetchCommits)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  const ventureName = (id: string | null) => (id ? ventures.find((v) => v.id === id)?.name ?? id : null);
  const owner = crew.find((c) => c.status === "bottleneck");
  const selectedVenture = logVentureId ? ventures.find((v) => v.id === logVentureId) ?? null : null;
  const visibleCommits = (logVentureId ? commits.filter((c) => c.venture_id === logVentureId) : commits).slice(0, 6);

  async function saveCrew(c: Crew, status: CrewStatus, task: string, note: string, ventureId: string | null) {
    await post("/api/crew", { id: c.id, status, task, note, current_venture_id: ventureId });
    setEditCrewId(null);
  }

  return (
    <>
      <div className="section-head"><span className="section-title">Estafette — Squad Status</span></div>
      <p className="section-sub">Aangedreven door echte Git-commits met <code>[PASS:NAAM]</code></p>
      {owner ? (
        <div className="owner-bar">⚠ Huidige code-eigenaar: <strong>{owner.name}</strong>{owner.note ? <> — <code>{owner.note}</code></> : null}{owner.current_venture_id ? <> op <strong>{ventureName(owner.current_venture_id)}</strong></> : null}</div>
      ) : (
        <div className="owner-bar none">✓ Geen actieve bottleneck — pipeline vrij</div>
      )}
      <div className="crew-list">
        {crew.map((c) => (
          <div key={c.id} className={"crew-card" + (c.status === "bottleneck" ? " bottleneck" : "")}>
            <div className="crew-top">
              <span className="rank-badge">{c.rank}</span>
              <div>
                <div className="crew-name">{c.name}</div>
                <div className="crew-role">{c.role}</div>
                <div className="crew-task">{c.task}</div>
                <div className="venture-tag">Bezig aan: {ventureName(c.current_venture_id) || "—"}</div>
              </div>
              <div className="crew-actions">
                <span className={"tag " + STATUS_TAG[c.status]}>{STATUS_LABEL[c.status]}</span>
                <button className="icon-btn" onClick={() => setEditCrewId(c.id)} aria-label="Bewerk">✎</button>
              </div>
            </div>
            {editCrewId === c.id && <CrewForm crew={c} ventures={ventures} onCancel={() => setEditCrewId(null)} onSave={(s, t, n, vid) => saveCrew(c, s, t, n, vid)} />}
          </div>
        ))}
        <div className="crew-card vacant">
          <div className="crew-top">
            <span className="rank-badge" style={{ background: "var(--idle)", color: "#0a0b0d" }}>—</span>
            <div>
              <div className="crew-name" style={{ color: "var(--text-dim)" }}>UI / UX — vacant</div>
              <div className="crew-role">Axel niet actief in hiërarchie</div>
              <div className="crew-task" style={{ color: "var(--text-faint)" }}>Frontend loopt via AI-generatie / tijdelijke templates.</div>
            </div>
            <span className="tag t-auto">Geautomatiseerd</span>
          </div>
        </div>
      </div>

      <div className="form-inline" style={{ marginTop: 18, marginBottom: 0 }}>
        <select value={logVentureId ?? ""} onChange={(e) => setLogVentureId(e.target.value || null)}>
          <option value="">— alle ventures —</option>
          {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="gitlog">
        <div className="gitlog-head">Recente Git-activiteit{selectedVenture ? ` — ${selectedVenture.name}` : " — alle ventures"}</div>
        {visibleCommits.length === 0 && <div className="gitlog-empty">Nog geen commits binnengekomen — zie README voor de webhook-setup.</div>}
        {visibleCommits.map((g) => (
          <div className="gitlog-line" key={g.id}>
            <span className="gl-time">{new Date(g.ts).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}</span>
            <span>{g.message}{!selectedVenture && g.venture_id ? ` (${ventureName(g.venture_id)})` : ""}</span>
            {g.pass_to && <span className="gl-pass">[PASS:{g.pass_to.toUpperCase()}]</span>}
          </div>
        ))}
      </div>
    </>
  );
}
