"use client";
import { Fragment, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ALL_PEOPLE } from "@/lib/people";

type CrewStatus = "waiting" | "active" | "bottleneck" | "auto";
type Stage = "scouting" | "sprint" | "exit-ready";
type TaskStatus = "todo" | "in_progress" | "handed_off" | "done";

interface Crew {
  id: string; name: string; rank: string; role: string;
  github_username: string | null; status: CrewStatus; task: string; note: string;
  current_venture_id: string | null;
}
interface Venture {
  id: string; name: string; stage: Stage; price: string; feature: string;
  repo_done: boolean; domein_done: boolean; stripe_done: boolean;
  github_repo: string | null; pitched_by: string | null;
  mrr: number; mrr_prev: number; sprint_deadline: string | null; sprint_label: string;
  mrr_source_url: string | null; mrr_synced_at: string | null; notion_url: string | null;
}
interface CommitRow { id: number; repo: string; venture_id: string | null; crew_id: string | null; sha: string; message: string; author: string; pass_to: string | null; ts: string; }
interface Directive { id: number; venture_id: string | null; author: string; type: "directive" | "veto"; text: string; ts: string; }
interface CrewEvent { id: number; crew_id: string; venture_id: string | null; from_status: string | null; to_status: string; source: string; ts: string; }
interface Metric { id: number; crew_id: string; venture_id: string | null; label: string; value: number; period: string; note: string | null; created_at: string; }
interface Payout { id: number; crew_id: string; venture_id: string | null; amount: number; note: string | null; paid_at: string; recorded_by: string; }
interface Task {
  id: number; venture_id: string; title: string; description: string; status: TaskStatus;
  created_by: string; assigned_to: string; handed_off_by: string | null; handed_off_at: string | null;
  created_at: string; updated_at: string;
}
type BillingCycle = "maandelijks" | "jaarlijks" | "eenmalig";
type ToolStatus = "active" | "cancelled";
interface Tool {
  id: number; name: string; category: string; url: string | null; cost: number;
  billing_cycle: BillingCycle; renews_on: string | null; account_owner: string | null;
  notes: string; status: ToolStatus; created_at: string; updated_at: string;
}

const STATUS_LABEL: Record<CrewStatus, string> = { waiting: "Wachtend", active: "Geïsoleerd · Actief", bottleneck: "Active Bottleneck", auto: "Geautomatiseerd" };
const STATUS_TAG: Record<CrewStatus, string> = { waiting: "t-waiting", active: "t-active", bottleneck: "t-bottleneck", auto: "t-auto" };
const STAGE_LABEL: Record<Stage, string> = { scouting: "Concept / Scouting", sprint: "Actieve Sprint (72u)", "exit-ready": "Exit Ready" };
const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "handed_off", "done"];
const TASK_STATUS_LABEL: Record<TaskStatus, string> = { todo: "Te doen", in_progress: "Bezig", handed_off: "Doorgegeven", done: "Klaar" };
const TASK_STATUS_TAG: Record<TaskStatus, string> = { todo: "t-todo", in_progress: "t-in_progress", handed_off: "t-handed_off", done: "t-done" };
// Elke kolom een eigen betekenisvolle kleur (zelfde semantiek als de rest van dit
// dashboard: idle = nog niet begonnen, accent = actief werk, warn = wacht op
// oppak-actie, good = klaar) -- niet zomaar 4 willekeurige tinten.
const TASK_COLOR: Record<TaskStatus, string> = { todo: "var(--idle)", in_progress: "var(--accent)", handed_off: "var(--warn)", done: "var(--good)" };
const PEOPLE_NAME: Record<string, string> = Object.fromEntries(ALL_PEOPLE.map((p) => [p.id, p.name]));
const TOOL_CATEGORIES = ["hosting", "database", "payments", "ai", "communicatie", "domein", "overig"] as const;
const TOOL_CATEGORY_LABEL: Record<string, string> = {
  hosting: "Hosting", database: "Database", payments: "Payments", ai: "AI",
  communicatie: "Communicatie", domein: "Domein", overig: "Overig",
};
const BILLING_LABEL: Record<BillingCycle, string> = { maandelijks: "/ maand", jaarlijks: "/ jaar", eenmalig: "eenmalig" };
const METRIC_LABELS: Record<string, string> = {
  outreach_contacted: "Outreach — contacted",
  outreach_replies: "Outreach — replies",
  outreach_meetings: "Outreach — meetings",
  ideas_pitched: "Ideeën gepitcht",
  other: "Overig",
};

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
function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(week)}`;
}

export default function Dashboard(props: {
  initialMe: string | null;
  initialCrew: Crew[]; initialVentures: Venture[]; initialCommits: CommitRow[];
  initialDirectives: Directive[]; initialCrewEvents: CrewEvent[]; initialMetrics: Metric[]; initialPayouts: Payout[];
  initialTasks: Task[]; initialTools: Tool[];
}) {
  const [crew, setCrew] = useState(props.initialCrew);
  const [ventures, setVentures] = useState(props.initialVentures);
  const [commits, setCommits] = useState(props.initialCommits);
  const [directives, setDirectives] = useState(props.initialDirectives);
  const [crewEvents, setCrewEvents] = useState(props.initialCrewEvents);
  const [metrics, setMetrics] = useState(props.initialMetrics);
  const [payouts, setPayouts] = useState(props.initialPayouts);
  const [tasks, setTasks] = useState(props.initialTasks);
  const [tools, setTools] = useState(props.initialTools);
  // Server-geverifieerd (flowsys_identity-cookie) -- geen los te kiezen dropdown
  // meer. Kan alleen veranderen via een echte login, dus geen state nodig.
  const me = props.initialMe ?? "";
  const meName = PEOPLE_NAME[me] ?? me;
  const [now, setNow] = useState(Date.now());
  const [selectedVentureId, setSelectedVentureId] = useState<string | null>(null);

  const [editCrewId, setEditCrewId] = useState<string | null>(null);
  const [editMrrVentureId, setEditMrrVentureId] = useState<string | null>(null);
  const [openVentureId, setOpenVentureId] = useState<string | null>(null);
  const [editVentureId, setEditVentureId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [editToolId, setEditToolId] = useState<number | null>(null);
  const [directiveText, setDirectiveText] = useState("");
  const [syncingMrr, setSyncingMrr] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const refetch = {
      crew: () => supabaseBrowser.from("crew").select("*").order("rank").then(({ data }) => data && setCrew(data as Crew[])),
      ventures: () => supabaseBrowser.from("ventures").select("*").then(({ data }) => data && setVentures(data as Venture[])),
      commits: () => supabaseBrowser.from("commits").select("*").order("ts", { ascending: false }).limit(200).then(({ data }) => data && setCommits(data as CommitRow[])),
      directives: () => supabaseBrowser.from("directives").select("*").order("ts", { ascending: false }).limit(12).then(({ data }) => data && setDirectives(data as Directive[])),
      crew_events: () => supabaseBrowser.from("crew_events").select("*").order("ts", { ascending: false }).limit(200).then(({ data }) => data && setCrewEvents(data as CrewEvent[])),
      metrics: () => supabaseBrowser.from("metrics").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => data && setMetrics(data as Metric[])),
      payouts: () => supabaseBrowser.from("payouts").select("*").order("paid_at", { ascending: false }).limit(50).then(({ data }) => data && setPayouts(data as Payout[])),
      tasks: () => supabaseBrowser.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => data && setTasks(data as Task[])),
      tools: () => supabaseBrowser.from("tools").select("*").order("name").then(({ data }) => data && setTools(data as Tool[])),
    };
    const channel = supabaseBrowser
      .channel("flowsys-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "crew" }, refetch.crew)
      .on("postgres_changes", { event: "*", schema: "public", table: "ventures" }, refetch.ventures)
      .on("postgres_changes", { event: "*", schema: "public", table: "commits" }, refetch.commits)
      .on("postgres_changes", { event: "*", schema: "public", table: "directives" }, refetch.directives)
      .on("postgres_changes", { event: "*", schema: "public", table: "crew_events" }, refetch.crew_events)
      .on("postgres_changes", { event: "*", schema: "public", table: "metrics" }, refetch.metrics)
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, refetch.payouts)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch.tasks)
      .on("postgres_changes", { event: "*", schema: "public", table: "tools" }, refetch.tools)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) window.alert("Opslaan mislukt — probeer opnieuw.");
    return res.ok;
  }
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const ventureName = (id: string | null) => (id ? ventures.find((v) => v.id === id)?.name ?? id : null);
  const owner = crew.find((c) => c.status === "bottleneck");
  const lastActivityIso = [directives[0]?.ts, commits[0]?.ts].filter(Boolean).sort().reverse()[0] || null;

  const selectedVenture = selectedVentureId ? ventures.find((v) => v.id === selectedVentureId) ?? null : null;
  const totalMrr = ventures.reduce((s, v) => s + v.mrr, 0);
  const totalMrrPrev = ventures.reduce((s, v) => s + v.mrr_prev, 0);
  const mrr = selectedVenture ? selectedVenture.mrr : totalMrr;
  const mrrPrev = selectedVenture ? selectedVenture.mrr_prev : totalMrrPrev;
  const deltaPct = mrrPrev ? ((mrr - mrrPrev) / mrrPrev) * 100 : 0;
  const exit = Math.floor(mrr * 4.5);

  const clockVenture = selectedVenture ?? [...ventures].filter((v) => v.sprint_deadline).sort((a, b) => new Date(a.sprint_deadline!).getTime() - new Date(b.sprint_deadline!).getTime())[0] ?? null;
  let clockText = "--:--:--", clockFoot = "geen actieve sprint", urgent = false;
  if (clockVenture?.sprint_deadline) {
    const remaining = new Date(clockVenture.sprint_deadline).getTime() - now;
    if (remaining <= 0) { clockText = "00:00:00"; clockFoot = `sprint venster verlopen — ${clockVenture.name}`; urgent = true; }
    else {
      const h = Math.floor(remaining / 3600000), m = Math.floor((remaining % 3600000) / 60000), s = Math.floor((remaining % 60000) / 1000);
      clockText = `${pad(h)}:${pad(m)}:${pad(s)}`;
      clockFoot = `resterend — ${clockVenture.name}`;
      urgent = h < 24;
    }
  }

  const activeTools = tools.filter((t) => t.status === "active");
  const monthlyToolsCost = activeTools.reduce((s, t) => s + (t.billing_cycle === "jaarlijks" ? t.cost / 12 : t.billing_cycle === "maandelijks" ? t.cost : 0), 0);
  const nextRenewal = [...activeTools].filter((t) => t.renews_on).sort((a, b) => (a.renews_on! < b.renews_on! ? -1 : 1))[0] ?? null;

  const visibleCommits = (selectedVentureId ? commits.filter((c) => c.venture_id === selectedVentureId) : commits).slice(0, 6);
  const visibleTasks = selectedVentureId ? tasks.filter((t) => t.venture_id === selectedVentureId) : tasks;
  const myOpenTasks = tasks.filter((t) => t.assigned_to === me && t.status !== "done");

  async function saveCrew(c: Crew, status: CrewStatus, task: string, note: string, ventureId: string | null) {
    await post("/api/crew", { id: c.id, status, task, note, current_venture_id: ventureId });
    setEditCrewId(null);
  }
  async function saveMrr(ventureId: string, val: number) {
    await post("/api/venture", { id: ventureId, mrr: val });
    setEditMrrVentureId(null);
  }
  async function resetSprint() {
    const v = clockVenture;
    if (!v) { window.alert("Selecteer eerst een venture."); return; }
    await post("/api/venture", { id: v.id, resetSprintHours: 72, sprintLabel: v.sprint_label || v.name });
  }
  async function saveVenture(v: Venture, patch: Partial<Venture>) {
    await post("/api/venture", { id: v.id, ...patch });
    setEditVentureId(null);
  }
  async function syncMrr() {
    setSyncingMrr(true);
    await fetch("/api/mrr-sync", { method: "POST" }).catch(() => {});
    setSyncingMrr(false);
  }
  async function deploy() {
    const text = directiveText.trim();
    if (!text) return;
    await post("/api/directive", { author: meName, text, venture_id: selectedVentureId });
    setDirectiveText("");
  }
  async function createTask(body: { venture_id: string; title: string; description: string; assigned_to: string }) {
    const ok = await post("/api/tasks", body);
    return ok;
  }
  async function saveTask(t: Task, patch: { title?: string; description?: string; status?: TaskStatus; assigned_to?: string }) {
    await post(`/api/tasks/${t.id}`, patch);
    setEditTaskId(null);
  }
  async function createTool(body: Record<string, unknown>) {
    return post("/api/tools", body);
  }
  async function saveTool(t: Tool, patch: Record<string, unknown>) {
    await post(`/api/tools/${t.id}`, patch);
    setEditToolId(null);
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand"><span className="brand-mark">FLOW SYSTEMS</span><span className="brand-sub">// Command Center</span></div>
        <div className="topbar-right">
          <span className="status-pulse"><span className="dot" /> Live</span>
          <span className="identity">Ingelogd als <b>{meName}</b></span>
          <button className="btn ghost" onClick={logout}>Uitloggen</button>
        </div>
      </div>
      <p className="section-sub">Laatste activiteit: <b>{relTime(lastActivityIso)}</b></p>

      {/* WERKWIJZE */}
      <div className="workflow-card">
        <div className="workflow-head">
          <span className="workflow-title">Werkwijze — voor &amp; na elke sessie</span>
          <span className="workflow-sub">Voor Seba en Laurens</span>
        </div>
        <div className="workflow-grid">
          <div>
            <div className="workflow-col-label">Voor je begint</div>
            <ol className="workflow-steps">
              <li><span className="workflow-num">1</span><span>Check <b>Voor jou</b> bij Taken hieronder — staat er iets klaar dat is doorgestuurd?</span></li>
              <li><span className="workflow-num">2</span><span>Lees de VETO Console onderaan voor nieuwe instructies van Matthias.</span></li>
              <li><span className="workflow-num">3</span><span>Werk in de juiste projectmap — zie de naamregel hieronder.</span></li>
            </ol>
          </div>
          <div>
            <div className="workflow-col-label after">Na afloop</div>
            <ol className="workflow-steps">
              <li><span className="workflow-num">1</span><span>Commit en push je werk. Gebruik <code>[PASS:NAAM]</code> in de commit-message als je het doorgeeft.</span></li>
              <li><span className="workflow-num">2</span><span>Zet de taak op de juiste status — Bezig, Klaar, of stuur 'm door naar de volgende persoon.</span></li>
              <li><span className="workflow-num">3</span><span>Sluit je sessie gewoon af — die meldt zichzelf automatisch bij het Agent Dashboard.</span></li>
            </ol>
          </div>
        </div>
        <div className="workflow-callout">
          <span className="workflow-callout-icon">📁</span>
          <p><b>Eén map per programma.</b> Noem je projectmap exact zoals de venture hierboven heet (bv. <code>tendertox</code>, <code>suppliersync</code>) — geen extra tekst zoals &quot;voor seba&quot;, geen submappen. Het Agent Dashboard toont de mapnaam automatisch als projectnaam, dus alleen zo klopt wat Matthias daar ziet.</p>
        </div>
      </div>

      {/* 00 OVERVIEW */}
      <div className="section-head"><span className="section-num">00</span><span className="section-title">Alles-oké? — Venture Overzicht</span><span className="section-line" /></div>
      <p className="section-sub">Klik een venture om de rest van de pagina daarop te focussen{selectedVenture ? " — klik nogmaals om te wissen" : ""}</p>
      <div className="venture-strip">
        {ventures.map((v) => {
          const workers = crew.filter((c) => c.current_venture_id === v.id);
          const hasBottleneck = workers.some((c) => c.status === "bottleneck");
          const deadlinePassed = !!(v.sprint_deadline && new Date(v.sprint_deadline).getTime() < now);
          let cls = "", label = "Scouting";
          if (hasBottleneck || deadlinePassed) { cls = "status-bad"; label = deadlinePassed ? "Deadline verlopen" : "Bottleneck"; }
          else if (v.stage === "exit-ready") { cls = "status-good"; label = "Exit Ready"; }
          else if (v.stage === "sprint" && workers.length === 0) { cls = "status-warn"; label = "Stil — niemand actief"; }
          else if (v.stage === "sprint") { cls = "status-good"; label = "Loopt"; }
          return (
            <button key={v.id} className={`venture-chip ${cls} ${selectedVentureId === v.id ? "selected" : ""}`} onClick={() => setSelectedVentureId(selectedVentureId === v.id ? null : v.id)}>
              <div className="vc-name">{v.name}</div>
              <div className="vc-stage">{STAGE_LABEL[v.stage]}</div>
              {v.mrr > 0 && <div className="vc-mrr">{fmtEUR(v.mrr)}{v.mrr_source_url && <span className="vc-live">live</span>}</div>}
              <div className="vc-status-label">{label}</div>
              <div className="vc-who">{workers.length ? workers.map((w) => w.name).join(", ") : "niemand actief"}</div>
            </button>
          );
        })}
      </div>

      {/* TELEMETRY */}
      <div className="section-head"><span className="section-num">01</span><span className="section-title">Telemetrie{selectedVenture ? ` — ${selectedVenture.name}` : ""}</span><span className="section-line" /></div>
      <p className="section-sub">{selectedVenture ? "MRR van deze venture" : "Holding-MRR — som van alle dochterbedrijven"}</p>
      <div className="telemetry">
        <div className="tile">
          <div className="tile-label">
            <span>{selectedVenture ? "Venture MRR" : "Holding MRR"}</span>
            <span style={{ display: "flex", gap: 4 }}>
              <button className="icon-btn" onClick={syncMrr} disabled={syncingMrr} aria-label="Sync live MRR via Stripe" title="Haal live MRR op via Stripe">{syncingMrr ? "…" : "⟳"}</button>
              {selectedVenture && <button className="icon-btn" onClick={() => setEditMrrVentureId(selectedVenture.id)} aria-label="Bewerk MRR">✎</button>}
            </span>
          </div>
          {editMrrVentureId && selectedVenture ? (
            <MrrForm initial={selectedVenture.mrr} onCancel={() => setEditMrrVentureId(null)} onSave={(v) => saveMrr(selectedVenture.id, v)} />
          ) : (
            <div className="tile-value">{fmtEUR(mrr)}
              {mrrPrev > 0 && <span className={"tile-delta " + (deltaPct >= 0 ? "up" : "down")}>{deltaPct >= 0 ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}%</span>}
            </div>
          )}
          <div className="tile-foot">
            {selectedVenture
              ? selectedVenture.mrr_source_url
                ? `Live via Stripe · gesynct ${relTime(selectedVenture.mrr_synced_at)}`
                : "Klik ✎ om bij te werken"
              : `Som van ${ventures.length} ventures${ventures.some((v) => v.mrr_source_url) ? ` · ${ventures.filter((v) => v.mrr_source_url).length} live via Stripe` : ""}`}
          </div>
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
                  {ventures.filter((v) => v.stage === stage).map((v) => (
                    <div className="app-card" key={v.id}>
                      <div className="app-head" onClick={() => setOpenVentureId(openVentureId === v.id ? null : v.id)}>
                        <span className="app-name-row"><span className="app-name">{v.name}</span>{v.stage === "sprint" && <span className="app-badge">In Productie</span>}</span>
                        <span className={"chev" + (openVentureId === v.id ? " open" : "")}>⌄</span>
                      </div>
                      {openVentureId === v.id && (
                        editVentureId === v.id ? (
                          <VentureForm venture={v} crew={crew} onCancel={() => setEditVentureId(null)} onSave={(patch) => saveVenture(v, patch)} />
                        ) : (
                          <div className="detail-inner">
                            <div className="detail-row"><span>Prijs / potentieel</span><span>{v.price}</span></div>
                            {v.feature && <div className="detail-row"><span>Feature</span><span>{v.feature}</span></div>}
                            {v.pitched_by && <div className="detail-row"><span>Gepitcht door</span><span>{crew.find((c) => c.id === v.pitched_by)?.name ?? v.pitched_by}</span></div>}
                            {v.notion_url && <div className="detail-row"><span>Notities</span><span><a href={v.notion_url} target="_blank" rel="noreferrer">Open in Notion →</a></span></div>}
                            <div className="isolation">
                              <span className={"iso-item " + (v.repo_done ? "done" : "pending")}>{v.repo_done ? "●" : "○"} Repo</span>
                              <span className={"iso-item " + (v.domein_done ? "done" : "pending")}>{v.domein_done ? "●" : "○"} Domein</span>
                              <span className={"iso-item " + (v.stripe_done ? "done" : "pending")}>{v.stripe_done ? "●" : "○"} Stripe</span>
                            </div>
                            <div className="edit-actions" style={{ marginTop: 10 }}><button className="btn" onClick={() => setEditVentureId(v.id)}>Bewerken</button></div>
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

      {/* TAKEN */}
      <div className="section-head"><span className="section-num">04</span><span className="section-title">Taken{selectedVenture ? ` — ${selectedVenture.name}` : ""}</span><span className="section-line" /></div>
      <p className="section-sub">Wat moet er nog gebeuren, en van wie naar wie</p>

      {myOpenTasks.length > 0 ? (
        <div className="for-you">
          <div className="for-you-head">Voor jou <span className="for-you-count">{myOpenTasks.length}</span></div>
          {myOpenTasks.map((t) => (
            <div className="for-you-line" key={t.id}>
              <span><span className="venture">{ventureName(t.venture_id)}</span>{t.title}</span>
              <span className={"tag " + TASK_STATUS_TAG[t.status]}>{TASK_STATUS_LABEL[t.status]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="for-you empty">Niks voor jou openstaand — mooi zo.</div>
      )}

      <div className="pipeline cols-4">
        {TASK_STATUSES.map((stage, idx) => (
          <div key={stage}>
            <div className="col-head"><b style={{ color: TASK_COLOR[stage] }}>{pad(idx + 1)}</b> {TASK_STATUS_LABEL[stage]}</div>
            <div className="col-body">
              {visibleTasks.filter((t) => t.status === stage).map((t) => (
                <div className="app-card" style={{ borderLeft: `3px solid ${TASK_COLOR[t.status]}` }} key={t.id}>
                  <div className="app-head" onClick={() => setOpenTaskId(openTaskId === t.id ? null : t.id)}>
                    <span className="app-name-row">
                      <span className="app-name">{t.title}</span>
                      {!selectedVenture && <span className="task-venture-badge">{ventureName(t.venture_id)}</span>}
                    </span>
                    <span className={"chev" + (openTaskId === t.id ? " open" : "")}>⌄</span>
                  </div>
                  {openTaskId === t.id && (
                    editTaskId === t.id ? (
                      <TaskForm task={t} crew={crew} onCancel={() => setEditTaskId(null)} onSave={(patch) => saveTask(t, patch)} />
                    ) : (
                      <div className="detail-inner">
                        {t.description && <div className="task-desc">{t.description}</div>}
                        <div className="detail-row"><span>Toegewezen aan</span><span>{crew.find((c) => c.id === t.assigned_to)?.name ?? t.assigned_to}</span></div>
                        <div className="detail-row"><span>Aangemaakt door</span><span>{PEOPLE_NAME[t.created_by] ?? t.created_by}</span></div>
                        {t.handed_off_by && <div className="detail-row"><span>Laatst doorgestuurd door</span><span>{crew.find((c) => c.id === t.handed_off_by)?.name ?? t.handed_off_by} · {relTime(t.handed_off_at)}</span></div>}
                        <div className="edit-actions" style={{ marginTop: 10 }}><button className="btn" onClick={() => setEditTaskId(t.id)}>Bewerken / doorsturen</button></div>
                      </div>
                    )
                  )}
                </div>
              ))}
              {visibleTasks.filter((t) => t.status === stage).length === 0 && <div className="col-empty">—</div>}
            </div>
          </div>
        ))}
      </div>
      <TaskCreateForm crew={crew} ventures={ventures} defaultVentureId={selectedVentureId} onSubmit={createTask} />

      {/* PRESTATIES */}
      <div className="section-head"><span className="section-num">05</span><span className="section-title">Prestaties</span><span className="section-line" /></div>
      <p className="section-sub">Commits uit Git zijn automatisch; outreach/scouting log je handmatig hieronder</p>
      <div className="perf-grid">
        {crew.map((c) => {
          const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
          const commitCount = commits.filter((cm) => cm.crew_id === c.id && new Date(cm.ts).getTime() > sevenDaysAgo).length;
          const handoffCount = crewEvents.filter((e) => e.crew_id === c.id && e.to_status === "bottleneck" && e.source === "webhook" && new Date(e.ts).getTime() > sevenDaysAgo).length;
          const recentMetrics = metrics.filter((m) => m.crew_id === c.id).slice(0, 3);
          return (
            <div className="perf-card" key={c.id}>
              <div className="perf-name">{c.name}</div>
              <div className="perf-stats">
                <div><div className="perf-stat-num">{commitCount}</div><div className="perf-stat-label">Commits (7d)</div></div>
                <div><div className="perf-stat-num">{handoffCount}</div><div className="perf-stat-label">PASS ontvangen (7d)</div></div>
              </div>
              <div className="perf-metrics">
                {recentMetrics.length === 0 && <div className="perf-metric-empty">Nog geen metrics gelogd.</div>}
                {recentMetrics.map((m) => (
                  <div className="perf-metric-line" key={m.id}><span>{METRIC_LABELS[m.label] ?? m.label} ({m.period})</span><span>{m.value}</span></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <MetricForm crew={crew} ventures={ventures} defaultPeriod={isoWeek(new Date())} onSubmit={(body) => post("/api/metrics", body)} />

      {/* UITBETALINGEN */}
      <div className="section-head"><span className="section-num">06</span><span className="section-title">Uitbetalingen</span><span className="section-line" /></div>
      <p className="section-sub">Alleen een overzicht — dit voert nooit zelf een betaling uit, jij betaalt en logt het hier</p>
      <div className="ledger-wrap">
        <table className="ledger-table">
          <thead><tr><th>Venture</th><th className="num">MRR</th><th>Gepitcht door</th><th className="num">Zende royalty (5%)</th><th className="num">House-aandeel</th></tr></thead>
          <tbody>
            {ventures.filter((v) => v.mrr > 0).map((v) => {
              const royalty = v.pitched_by === "zende" ? v.mrr * 0.05 : 0;
              return (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td className="num">{fmtEUR(v.mrr)}</td>
                  <td>{crew.find((c) => c.id === v.pitched_by)?.name ?? "—"}</td>
                  <td className="num">{royalty > 0 ? fmtEUR(royalty) : "—"}</td>
                  <td className="num">{fmtEUR(v.mrr - royalty)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="gitlog" style={{ marginTop: 14 }}>
        <div className="gitlog-head">Uitbetalingslog</div>
        {payouts.length === 0 && <div className="gitlog-empty">Nog geen uitbetalingen gelogd.</div>}
        {payouts.map((p) => (
          <div className="gitlog-line" key={p.id}>
            <span className="gl-time">{new Date(p.paid_at).toLocaleDateString("nl-BE")}</span>
            <span>{crew.find((c) => c.id === p.crew_id)?.name ?? p.crew_id} — {fmtEUR(p.amount)}{p.note ? ` (${p.note})` : ""}</span>
            <span className="gl-pass">door {p.recorded_by}</span>
          </div>
        ))}
        <PayoutForm crew={crew} ventures={ventures} me={meName} onSubmit={(body) => post("/api/payouts", body)} />
      </div>

      {/* CONSOLE */}
      <div className="section-head"><span className="section-num">07</span><span className="section-title">VETO Console</span><span className="section-line" /></div>
      <p className="section-sub">Matthias — rank 1, veto-macht{selectedVenture ? ` — gericht op ${selectedVenture.name}` : " — algemeen"}</p>
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

      {/* TOOLS & ABONNEMENTEN */}
      <div className="section-head"><span className="section-num">08</span><span className="section-title">Tools &amp; Abonnementen</span><span className="section-line" /></div>
      <p className="section-sub">Alle programma&apos;s en diensten die Flow Systems gebruikt, op één plek</p>
      <div className="telemetry" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: 16 }}>
        <div className="tile">
          <div className="tile-label"><span>Totaal / maand</span></div>
          <div className="tile-value">{fmtEUR(monthlyToolsCost)}</div>
          <div className="tile-foot">{activeTools.length} actieve {activeTools.length === 1 ? "tool" : "tools"}</div>
        </div>
        <div className="tile">
          <div className="tile-label"><span>Eerstvolgende vervaldatum</span></div>
          <div className="tile-value" style={{ fontSize: 22 }}>{nextRenewal ? new Date(nextRenewal.renews_on!).toLocaleDateString("nl-BE") : "—"}</div>
          <div className="tile-foot">{nextRenewal ? nextRenewal.name : "niks gepland"}</div>
        </div>
      </div>
      <div className="ledger-wrap">
        <table className="ledger-table">
          <thead>
            <tr><th>Naam</th><th className="num">Kosten</th><th>Vervalt</th><th>Beheerder</th><th></th></tr>
          </thead>
          <tbody>
            {tools.map((t) => (
              <Fragment key={t.id}>
                <tr style={{ opacity: t.status === "cancelled" ? 0.5 : 1 }}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text)" }}>{t.name}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                      <span className="task-venture-badge">{TOOL_CATEGORY_LABEL[t.category] ?? t.category}</span>
                      {t.status === "cancelled" && <span className="task-venture-badge">Geannuleerd</span>}
                      {t.url && <a href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "var(--accent)" }}>Open →</a>}
                    </div>
                  </td>
                  <td className="num">{t.cost > 0 ? `${fmtEUR(t.cost)} ${BILLING_LABEL[t.billing_cycle]}` : "gratis"}</td>
                  <td>{t.renews_on ? new Date(t.renews_on).toLocaleDateString("nl-BE") : "—"}</td>
                  <td>{t.account_owner ? (PEOPLE_NAME[t.account_owner] ?? t.account_owner) : "—"}</td>
                  <td style={{ textAlign: "right" }}><button className="icon-btn" onClick={() => setEditToolId(editToolId === t.id ? null : t.id)} aria-label="Bewerk">✎</button></td>
                </tr>
                {editToolId === t.id && (
                  <tr><td colSpan={5}><ToolForm tool={t} onCancel={() => setEditToolId(null)} onSave={(patch) => saveTool(t, patch)} /></td></tr>
                )}
              </Fragment>
            ))}
            {tools.length === 0 && <tr><td colSpan={5} style={{ fontStyle: "italic", color: "var(--text-faint)" }}>Nog niks toegevoegd.</td></tr>}
          </tbody>
        </table>
      </div>
      <ToolCreateForm onSubmit={createTool} />

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

function CrewForm({ crew, ventures, onCancel, onSave }: { crew: Crew; ventures: Venture[]; onCancel: () => void; onSave: (status: CrewStatus, task: string, note: string, ventureId: string | null) => void }) {
  const [status, setStatus] = useState<CrewStatus>(crew.status);
  const [task, setTask] = useState(crew.task);
  const [note, setNote] = useState(crew.note);
  const [ventureId, setVentureId] = useState(crew.current_venture_id ?? "");
  return (
    <div className="edit-form">
      <div><label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as CrewStatus)}>
          {(Object.keys(STATUS_LABEL) as CrewStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div><label>Bezig aan (venture)</label>
        <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}>
          <option value="">— geen —</option>
          {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div><label>Taak / laatste actie</label><input className="field" value={task} onChange={(e) => setTask(e.target.value)} /></div>
      <div><label>PASS-notitie (optioneel)</label><input className="field" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="edit-actions"><button className="btn primary" onClick={() => onSave(status, task, note, ventureId || null)}>Opslaan</button><button className="btn ghost" onClick={onCancel}>Annuleren</button></div>
    </div>
  );
}

function VentureForm({ venture, crew, onCancel, onSave }: { venture: Venture; crew: Crew[]; onCancel: () => void; onSave: (patch: Partial<Venture>) => void }) {
  const [stage, setStage] = useState<Stage>(venture.stage);
  const [price, setPrice] = useState(venture.price);
  const [feature, setFeature] = useState(venture.feature);
  const [githubRepo, setGithubRepo] = useState(venture.github_repo ?? "");
  const [mrrSourceUrl, setMrrSourceUrl] = useState(venture.mrr_source_url ?? "");
  const [notionUrl, setNotionUrl] = useState(venture.notion_url ?? "");
  const [pitchedBy, setPitchedBy] = useState(venture.pitched_by ?? "");
  const [repo, setRepo] = useState(venture.repo_done);
  const [domein, setDomein] = useState(venture.domein_done);
  const [stripe, setStripe] = useState(venture.stripe_done);
  return (
    <div className="edit-form">
      <div><label>Fase</label>
        <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </div>
      <div><label>Prijs / potentieel</label><input className="field" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
      <div><label>Feature</label><input className="field" value={feature} onChange={(e) => setFeature(e.target.value)} /></div>
      <div><label>GitHub-repo (voor de webhook)</label><input className="field" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} placeholder="bv. suppliersync" /></div>
      <div><label>MRR-endpoint (voor live Stripe-sync)</label><input className="field" value={mrrSourceUrl} onChange={(e) => setMrrSourceUrl(e.target.value)} placeholder="bv. https://www.tendertox.com/api/mrr" /></div>
      <div><label>Notion-link (optioneel)</label><input className="field" value={notionUrl} onChange={(e) => setNotionUrl(e.target.value)} placeholder="https://notion.so/..." /></div>
      <div><label>Gepitcht door</label>
        <select value={pitchedBy} onChange={(e) => setPitchedBy(e.target.value)}>
          <option value="">— onbekend / House —</option>
          {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="checks">
        <label className="check-label"><input type="checkbox" checked={repo} onChange={(e) => setRepo(e.target.checked)} /> Repo</label>
        <label className="check-label"><input type="checkbox" checked={domein} onChange={(e) => setDomein(e.target.checked)} /> Domein</label>
        <label className="check-label"><input type="checkbox" checked={stripe} onChange={(e) => setStripe(e.target.checked)} /> Stripe</label>
      </div>
      <div className="edit-actions">
        <button className="btn primary" onClick={() => onSave({ stage, price, feature, github_repo: githubRepo || null, mrr_source_url: mrrSourceUrl || null, notion_url: notionUrl || null, pitched_by: pitchedBy || null, repo_done: repo, domein_done: domein, stripe_done: stripe })}>Opslaan</button>
        <button className="btn ghost" onClick={onCancel}>Annuleren</button>
      </div>
    </div>
  );
}

function TaskForm({ task, crew, onCancel, onSave }: {
  task: Task; crew: Crew[]; onCancel: () => void;
  onSave: (patch: { title?: string; description?: string; status?: TaskStatus; assigned_to?: string }) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to);
  return (
    <div className="edit-form">
      <div><label>Titel</label><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label>Omschrijving</label><input className="field" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div><label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div><label>Toegewezen aan — kiezen = doorsturen</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="edit-actions">
        <button className="btn primary" onClick={() => onSave({ title, description, status, assigned_to: assignedTo })}>Opslaan</button>
        <button className="btn ghost" onClick={onCancel}>Annuleren</button>
      </div>
    </div>
  );
}

function TaskCreateForm({ crew, ventures, defaultVentureId, onSubmit }: {
  crew: Crew[]; ventures: Venture[]; defaultVentureId: string | null;
  onSubmit: (body: { venture_id: string; title: string; description: string; assigned_to: string }) => Promise<boolean>;
}) {
  const [ventureId, setVentureId] = useState(defaultVentureId ?? ventures[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState(crew[0]?.id ?? "");

  useEffect(() => { if (defaultVentureId) setVentureId(defaultVentureId); }, [defaultVentureId]);

  async function submit() {
    if (!title.trim()) return;
    const ok = await onSubmit({ venture_id: ventureId, title: title.trim(), description, assigned_to: assignedTo });
    if (ok) { setTitle(""); setDescription(""); }
  }

  return (
    <div className="form-inline">
      <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}>{ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <input className="field" placeholder="Titel van de taak" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="field" placeholder="omschrijving (optioneel)" value={description} onChange={(e) => setDescription(e.target.value)} />
      <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>{crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="btn primary" onClick={submit}>+ Taak aanmaken</button>
    </div>
  );
}

function ToolForm({ tool, onCancel, onSave }: {
  tool: Tool; onCancel: () => void; onSave: (patch: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(tool.name);
  const [category, setCategory] = useState(tool.category);
  const [url, setUrl] = useState(tool.url ?? "");
  const [cost, setCost] = useState(tool.cost);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(tool.billing_cycle);
  const [renewsOn, setRenewsOn] = useState(tool.renews_on ?? "");
  const [accountOwner, setAccountOwner] = useState(tool.account_owner ?? "");
  const [notes, setNotes] = useState(tool.notes);
  const [status, setStatus] = useState<ToolStatus>(tool.status);
  return (
    <div className="edit-form">
      <div><label>Naam</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><label>Categorie</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {TOOL_CATEGORIES.map((c) => <option key={c} value={c}>{TOOL_CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>
      <div><label>Link</label><input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
      <div style={{ display: "flex", gap: 9 }}>
        <div style={{ flex: 1 }}><label>Kosten (€)</label><input className="field" type="number" min={0} value={cost} onChange={(e) => setCost(parseFloat(e.target.value || "0"))} /></div>
        <div style={{ flex: 1 }}><label>Cyclus</label>
          <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}>
            {(Object.keys(BILLING_LABEL) as BillingCycle[]).map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div><label>Vervaldatum (optioneel)</label><input className="field" type="date" value={renewsOn} onChange={(e) => setRenewsOn(e.target.value)} /></div>
      <div><label>Beheerder</label>
        <select value={accountOwner} onChange={(e) => setAccountOwner(e.target.value)}>
          <option value="">— onbekend —</option>
          {ALL_PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div><label>Notities</label><input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div><label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as ToolStatus)}>
          <option value="active">Actief</option>
          <option value="cancelled">Geannuleerd</option>
        </select>
      </div>
      <div className="edit-actions">
        <button className="btn primary" onClick={() => onSave({ name, category, url: url || null, cost, billing_cycle: billingCycle, renews_on: renewsOn || null, account_owner: accountOwner || null, notes, status })}>Opslaan</button>
        <button className="btn ghost" onClick={onCancel}>Annuleren</button>
      </div>
    </div>
  );
}

function ToolCreateForm({ onSubmit }: { onSubmit: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("overig");
  const [cost, setCost] = useState<number>(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("maandelijks");
  const [accountOwner, setAccountOwner] = useState("");

  async function submit() {
    if (!name.trim()) return;
    const ok = await onSubmit({ name: name.trim(), category, cost, billing_cycle: billingCycle, account_owner: accountOwner || null });
    if (ok) { setName(""); setCost(0); }
  }

  return (
    <div className="form-inline">
      <input className="field" placeholder="Naam (bv. Vercel)" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>{TOOL_CATEGORIES.map((c) => <option key={c} value={c}>{TOOL_CATEGORY_LABEL[c]}</option>)}</select>
      <input className="field" type="number" min={0} placeholder="kosten €" value={cost || ""} onChange={(e) => setCost(parseFloat(e.target.value || "0"))} style={{ maxWidth: 100 }} />
      <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}>{(Object.keys(BILLING_LABEL) as BillingCycle[]).map((b) => <option key={b} value={b}>{b}</option>)}</select>
      <select value={accountOwner} onChange={(e) => setAccountOwner(e.target.value)}><option value="">— beheerder —</option>{ALL_PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button className="btn primary" onClick={submit}>+ Tool toevoegen</button>
    </div>
  );
}

function MetricForm({ crew, ventures, defaultPeriod, onSubmit }: {
  crew: Crew[]; ventures: Venture[]; defaultPeriod: string;
  onSubmit: (body: unknown) => Promise<boolean>;
}) {
  const [crewId, setCrewId] = useState(crew[0]?.id ?? "");
  const [label, setLabel] = useState("outreach_contacted");
  const [ventureId, setVentureId] = useState("");
  const [value, setValue] = useState<number>(0);
  const [period, setPeriod] = useState(defaultPeriod);
  const [note, setNote] = useState("");

  async function submit() {
    const ok = await onSubmit({ crew_id: crewId, venture_id: ventureId || null, label, value, period, note: note || null });
    if (ok) { setValue(0); setNote(""); }
  }

  return (
    <div className="form-inline">
      <select value={crewId} onChange={(e) => setCrewId(e.target.value)}>{crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={label} onChange={(e) => setLabel(e.target.value)}>{Object.keys(METRIC_LABELS).map((k) => <option key={k} value={k}>{METRIC_LABELS[k]}</option>)}</select>
      <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}><option value="">— algemeen —</option>{ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <input className="field" type="number" value={value} onChange={(e) => setValue(parseFloat(e.target.value || "0"))} style={{ maxWidth: 90 }} />
      <input className="field" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ maxWidth: 100 }} title="ISO-week, bv. 2026-W35" />
      <input className="field" placeholder="notitie (optioneel)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn primary" onClick={submit}>+ Metric loggen</button>
    </div>
  );
}

function PayoutForm({ crew, ventures, me, onSubmit }: {
  crew: Crew[]; ventures: Venture[]; me: string; onSubmit: (body: unknown) => Promise<boolean>;
}) {
  const [crewId, setCrewId] = useState("zende");
  const [ventureId, setVentureId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");

  async function submit() {
    if (!amount || amount <= 0) { window.alert("Vul een bedrag > 0 in."); return; }
    const ok = await onSubmit({ crew_id: crewId, venture_id: ventureId || null, amount, note: note || null, recorded_by: me });
    if (ok) { setAmount(0); setNote(""); }
  }

  return (
    <div className="form-inline">
      <select value={crewId} onChange={(e) => setCrewId(e.target.value)}>{crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}><option value="">— algemeen —</option>{ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <input className="field" type="number" placeholder="bedrag €" value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value || "0"))} style={{ maxWidth: 110 }} />
      <input className="field" placeholder="notitie (optioneel)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn primary" onClick={submit}>+ Uitbetaling loggen</button>
    </div>
  );
}
