"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

type CrewStatus = "waiting" | "active" | "bottleneck" | "auto";
interface Crew {
  id: string; name: string; rank: string; role: string;
  github_username: string | null; status: CrewStatus; task: string; note: string;
}
interface PipelineApp {
  id: string; name: string; stage: "scouting" | "sprint" | "exit-ready";
  price: string; feature: string; repo_done: boolean; domein_done: boolean; stripe_done: boolean;
}
interface CommitRow { id: number; repo: string; sha: string; message: string; author: string; pass_to: string | null; ts: string; }
interface Directive { id: number; author: string; type: "directive" | "veto"; text: string; ts: string; }
interface Telemetry { id: number; mrr: number; mrr_prev: number; sprint_deadline: string | null; sprint_label: string; }

const STATUS_LABEL: Record<CrewStatus, string> = { waiting: "Wachtend", active: "Geïsoleerd · Actief", bottleneck: "Active Bottleneck", auto: "Geautomatiseerd" };
const STATUS_TAG: Record<CrewStatus, string> = { waiting: "t-waiting", active: "t-active", bottleneck: "t-bottleneck", auto: "t-auto" };
const STAGE_LABEL: Record<string, string> = { scouting: "Concept / Scouting", sprint: "Actieve Sprint (72u)", "exit-ready": "Exit Ready" };
const PEOPLE = ["Matthias", "Laurens", "Runar", "Seba", "Zende"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtEUR(n: number) { return "€" + Math.round(n).toLocaleString("nl-BE"); }
function relTime(iso: string | null) {
  if (!iso) return "nog nooit";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "zonet";
  if (m < 60) return m + " min geleden";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " u geleden";
  return Math.floor(h / 24) + " dagen geleden";
}

export default function Dashboard(props: {
  initialCrew: Crew[]; initialPipeline: PipelineApp[]; initialCommits: CommitRow[];
  initialDirectives: Directive[]; initialTelemetry: Telemetry | null;
}) {
  const [crew, setCrew] = useState(props.initialCrew);
  const [pipeline, setPipeline] = useState(props.initialPipeline);
  const [commits, setCommits] = useState(props.initialCommits);
  const [directives, setDirectives] = useState(props.initialDirectives);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(props.initialTelemetry);
  const [me, setMe] = useState<string>("");
  const [now, setNow] = useState(Date.now());

  const [editCrewId, setEditCrewId] = useState<string | null>(null);
  const [editMrr, setEditMrr] = useState(false);
  const [openAppId, setOpenAppId] = useState<string | null>(null);
  const [editAppId, setEditAppId] = useState<string | null>(null);
  const [directiveText, setDirectiveText] = useState("");

  useEffect(() => {
    try { setMe(localStorage.getItem("flowsys_me") || ""); } catch {}
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const refetch = {
      crew: () => supabaseBrowser.from("crew").select("*").order("rank").then(({ data }) => data && setCrew(data as Crew[])),
      pipeline: () => supabaseBrowser.from("pipeline").select("*").then(({ data }) => data && setPipeline(data as PipelineApp[])),
      commits: () => supabaseBrowser.from("commits").select("*").order("ts", { ascending: false }).limit(6).then(({ data }) => data && setCommits(data as CommitRow[])),
      directives: () => supabaseBrowser.from("directives").select("*").order("ts", { ascending: false }).limit(12).then(({ data }) => data && setDirectives(data as Directive[])),
      telemetry: () => supabaseBrowser.from("telemetry").select("*").eq("id", 1).limit(1).then(({ data }) => data?.[0] && setTelemetry(data[0] as Telemetry)),
    };
    const channel = supabaseBrowser
      .channel("flowsys-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "crew" }, refetch.crew)
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline" }, refetch.pipeline)
      .on("postgres_changes", { event: "*", schema: "public", table: "commits" }, refetch.commits)
      .on("postgres_changes", { event: "*", schema: "public", table: "directives" }, refetch.directives)
      .on("postgres_changes", { event: "*", schema: "public", table: "telemetry" }, refetch.telemetry)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  function pickMe(name: string) {
    setMe(name);
    try { localStorage.setItem("flowsys_me", name); } catch {}
  }
  function needsIdentity() {
    if (!me) { window.alert("Kies eerst je naam rechtsboven, zodat wijzigingen toe te wijzen zijn."); return true; }
    return false;
  }
  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) window.alert("Opslaan mislukt — probeer opnieuw.");
  }

  const owner = crew.find((c) => c.status === "bottleneck");
  const lastActivityIso = [directives[0]?.ts, commits[0]?.ts].filter(Boolean).sort().reverse()[0] || null;

  const mrr = telemetry?.mrr ?? 0;
  const mrrPrev = telemetry?.mrr_prev ?? 0;
  const deltaPct = mrrPrev ? ((mrr - mrrPrev) / mrrPrev) * 100 : 0;
  const exit = Math.floor(mrr * 4.5);

  let clockText = "--:--:--", clockFoot = "geen actieve sprint", urgent = false;
  if (telemetry?.sprint_deadline) {
    const remaining = new Date(telemetry.sprint_deadline).getTime() - now;
    if (remaining <= 0) { clockText = "00:00:00"; clockFoot = "sprint venster verlopen"; urgent = true; }
    else {
      const h = Math.floor(remaining / 3600000), m = Math.floor((remaining % 3600000) / 60000), s = Math.floor((remaining % 60000) / 1000);
      clockText = `${pad(h)}:${pad(m)}:${pad(s)}`;
      clockFoot = `resterend — ${telemetry.sprint_label}`;
      urgent = h < 24;
    }
  }

  async function saveCrew(c: Crew, status: CrewStatus, task: string, note: string) {
    if (needsIdentity()) return;
    await post("/api/crew", { id: c.id, status, task, note });
    setEditCrewId(null);
  }
  async function saveMrr(val: number) {
    if (needsIdentity()) return;
    await post("/api/telemetry", { mrr: val });
    setEditMrr(false);
  }
  async function resetSprint() {
    if (needsIdentity()) return;
    await post("/api/telemetry", { resetSprintHours: 72, sprintLabel: telemetry?.sprint_label || "Sprint" });
  }
  async function saveApp(p: PipelineApp, patch: Partial<PipelineApp>) {
    if (needsIdentity()) return;
    await post("/api/pipeline", { id: p.id, ...patch });
    setEditAppId(null);
  }
  async function deploy() {
    if (needsIdentity()) return;
    const text = directiveText.trim();
    if (!text) return;
    await post("/api/directive", { author: me, text });
    setDirectiveText("");
  }
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand"><span className="brand-mark">FLOW SYSTEMS</span><span className="brand-sub">// Command Center</span></div>
        <div className="topbar-right">
          <span className="status-pulse"><span className="dot" /> Live</span>
          <span className="identity">Ingelogd als
            <select value={me} onChange={(e) => pickMe(e.target.value)}>
              <option value="">Kies je naam…</option>
              {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </span>
          <button className="btn ghost" onClick={logout}>Uitloggen</button>
        </div>
      </div>
      <p className="section-sub">Laatste activiteit: <b>{relTime(lastActivityIso)}</b></p>

      {/* TELEMETRY */}
      <div className="section-head"><span className="section-num">01</span><span className="section-title">Telemetrie</span><span className="section-line" /></div>
      <p className="section-sub">M&amp;A-waardering, live berekend uit holding-MRR</p>
      <div className="telemetry">
        <div className="tile">
          <div className="tile-label">
            <span>Holding MRR</span>
            <button className="icon-btn" onClick={() => setEditMrr(true)} aria-label="Bewerk MRR">✎</button>
          </div>
          {editMrr ? (
            <MrrForm initial={mrr} onCancel={() => setEditMrr(false)} onSave={saveMrr} />
          ) : (
            <div className="tile-value">{fmtEUR(mrr)}
              <span className={"tile-delta " + (deltaPct >= 0 ? "up" : "down")}>{deltaPct >= 0 ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}%</span>
            </div>
          )}
          <div className="tile-foot">Gecombineerde recurring revenue, alle dochterbedrijven</div>
        </div>
        <div className="tile">
          <div className="tile-label"><span>Projected Exit Waardering</span></div>
          <div className="tile-value accent-color">{fmtEUR(exit)}</div>
          <div className="tile-foot">MRR × <b>4.5</b> multiple</div>
        </div>
        <div className={"tile" + (urgent ? " tile-urgent" : "")}>
          <div className="tile-label"><span>72u Sprint Klok</span></div>
          <div className={"tile-value" + (urgent ? " critical-color" : "")}>{clockText}</div>
          <div className="tile-foot">{clockFoot}<button className="btn ghost" style={{ marginLeft: "auto" }} onClick={resetSprint}>Start nieuwe 72u sprint</button></div>
        </div>
      </div>

      <div className="main-grid">
        <div>
          {/* SQUAD */}
          <div className="section-head"><span className="section-num">02</span><span className="section-title">Estafette — Squad Status</span><span className="section-line" /></div>
          <p className="section-sub">Aangedreven door echte Git-commits met <code>[PASS:NAAM]</code></p>
          {owner ? (
            <div className="owner-bar">⚠ Huidige code-eigenaar: <strong>{owner.name}</strong>{owner.note ? <> — <code>{owner.note}</code></> : null}</div>
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
                  </div>
                  <div className="crew-actions">
                    <span className={"tag " + STATUS_TAG[c.status]}>{STATUS_LABEL[c.status]}</span>
                    <button className="icon-btn" onClick={() => setEditCrewId(c.id)} aria-label="Bewerk">✎</button>
                  </div>
                </div>
                {editCrewId === c.id && <CrewForm crew={c} onCancel={() => setEditCrewId(null)} onSave={(s, t, n) => saveCrew(c, s, t, n)} />}
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

          <div className="gitlog">
            <div className="gitlog-head">Recente Git-activiteit ({commits.length ? commits[0].repo : "—"})</div>
            {commits.length === 0 && <div className="gitlog-empty">Nog geen commits binnengekomen — zie README voor de webhook-setup.</div>}
            {commits.map((g) => (
              <div className="gitlog-line" key={g.id}>
                <span className="gl-time">{new Date(g.ts).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>{g.message}</span>
                {g.pass_to && <span className="gl-pass">[PASS:{g.pass_to.toUpperCase()}]</span>}
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* PIPELINE */}
          <div className="section-head"><span className="section-num">03</span><span className="section-title">App Pipeline</span><span className="section-line" /></div>
          <p className="section-sub">M&amp;A-pipeline, van scouting tot exit-isolatie</p>
          <div className="pipeline">
            {(["scouting", "sprint", "exit-ready"] as const).map((stage, idx) => (
              <div key={stage}>
                <div className="col-head"><b>{pad(idx + 1)}</b> {STAGE_LABEL[stage]}</div>
                <div className="col-body">
                  {pipeline.filter((p) => p.stage === stage).map((p) => (
                    <div className="app-card" key={p.id}>
                      <div className="app-head" onClick={() => setOpenAppId(openAppId === p.id ? null : p.id)}>
                        <span className="app-name-row"><span className="app-name">{p.name}</span>{p.stage === "sprint" && <span className="app-badge">In Productie</span>}</span>
                        <span className={"chev" + (openAppId === p.id ? " open" : "")}>⌄</span>
                      </div>
                      {openAppId === p.id && (
                        editAppId === p.id ? (
                          <AppForm app={p} onCancel={() => setEditAppId(null)} onSave={(patch) => saveApp(p, patch)} />
                        ) : (
                          <div className="detail-inner">
                            <div className="detail-row"><span>Prijs / potentieel</span><span>{p.price}</span></div>
                            {p.feature && <div className="detail-row"><span>Feature</span><span>{p.feature}</span></div>}
                            <div className="isolation">
                              <span className={"iso-item " + (p.repo_done ? "done" : "pending")}>{p.repo_done ? "●" : "○"} Repo</span>
                              <span className={"iso-item " + (p.domein_done ? "done" : "pending")}>{p.domein_done ? "●" : "○"} Domein</span>
                              <span className={"iso-item " + (p.stripe_done ? "done" : "pending")}>{p.stripe_done ? "●" : "○"} Stripe</span>
                            </div>
                            <div className="edit-actions" style={{ marginTop: 10 }}><button className="btn" onClick={() => setEditAppId(p.id)}>Bewerken</button></div>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONSOLE */}
      <div className="section-head"><span className="section-num">04</span><span className="section-title">VETO Console</span><span className="section-line" /></div>
      <p className="section-sub">Matthias — rank 1, veto-macht</p>
      <div className="console">
        <div className="console-row">
          <span className="prompt-prefix">{(me || "GAST").toUpperCase()}@FLOWSYS:~$</span>
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
              <span className="ts">[{new Date(d.ts).toLocaleTimeString("nl-BE")}]</span> {d.type === "veto" ? "VETO" : "DIRECTIVE"} — {d.text} <span style={{ color: "var(--text-faint)" }}>({d.author})</span>
            </div>
          ))}
        </div>
      </div>

      <footer>FLOW SYSTEMS B.V. — INTERN GEBRUIK — NIET DELEN BUITEN KERNTEAM</footer>
    </div>
  );
}

function MrrForm({ initial, onCancel, onSave }: { initial: number; onCancel: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="edit-form">
      <input className="field" type="number" min={0} value={v} onChange={(e) => setV(parseInt(e.target.value || "0", 10))} />
      <div className="edit-actions"><button className="btn primary" onClick={() => onSave(v)}>Opslaan</button><button className="btn ghost" onClick={onCancel}>Annuleren</button></div>
    </div>
  );
}

function CrewForm({ crew, onCancel, onSave }: { crew: Crew; onCancel: () => void; onSave: (status: CrewStatus, task: string, note: string) => void }) {
  const [status, setStatus] = useState<CrewStatus>(crew.status);
  const [task, setTask] = useState(crew.task);
  const [note, setNote] = useState(crew.note);
  return (
    <div className="edit-form">
      <div><label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as CrewStatus)}>
          {(Object.keys(STATUS_LABEL) as CrewStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div><label>Taak / laatste actie</label><input className="field" value={task} onChange={(e) => setTask(e.target.value)} /></div>
      <div><label>PASS-notitie (optioneel)</label><input className="field" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="edit-actions"><button className="btn primary" onClick={() => onSave(status, task, note)}>Opslaan</button><button className="btn ghost" onClick={onCancel}>Annuleren</button></div>
    </div>
  );
}

function AppForm({ app, onCancel, onSave }: { app: PipelineApp; onCancel: () => void; onSave: (patch: Partial<PipelineApp>) => void }) {
  const [stage, setStage] = useState(app.stage);
  const [price, setPrice] = useState(app.price);
  const [feature, setFeature] = useState(app.feature);
  const [repo, setRepo] = useState(app.repo_done);
  const [domein, setDomein] = useState(app.domein_done);
  const [stripe, setStripe] = useState(app.stripe_done);
  return (
    <div className="edit-form">
      <div><label>Fase</label>
        <select value={stage} onChange={(e) => setStage(e.target.value as PipelineApp["stage"])}>
          {Object.keys(STAGE_LABEL).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </div>
      <div><label>Prijs / potentieel</label><input className="field" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
      <div><label>Feature</label><input className="field" value={feature} onChange={(e) => setFeature(e.target.value)} /></div>
      <div className="checks">
        <label className="check-label"><input type="checkbox" checked={repo} onChange={(e) => setRepo(e.target.checked)} /> Repo</label>
        <label className="check-label"><input type="checkbox" checked={domein} onChange={(e) => setDomein(e.target.checked)} /> Domein</label>
        <label className="check-label"><input type="checkbox" checked={stripe} onChange={(e) => setStripe(e.target.checked)} /> Stripe</label>
      </div>
      <div className="edit-actions">
        <button className="btn primary" onClick={() => onSave({ stage, price, feature, repo_done: repo, domein_done: domein, stripe_done: stripe })}>Opslaan</button>
        <button className="btn ghost" onClick={onCancel}>Annuleren</button>
      </div>
    </div>
  );
}
