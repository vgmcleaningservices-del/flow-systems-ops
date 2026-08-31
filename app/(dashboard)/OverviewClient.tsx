"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Crew, MrrSnapshot, Payout, Task, Tool, Venture, WikiPage } from "@/lib/dashboard-types";
import { fmtEUR, pad, relTime } from "@/lib/dashboard-format";
import { STAGE_LABEL } from "@/lib/dashboard-constants";
import { ForYouList } from "./_components/ForYouList";
import { staggerContainerVariants, staggerItemVariants, TiltCard } from "./_components/motion";
import { RevenueChart } from "./_components/RevenueChart";
import { MrrForm } from "./MrrForm";

// Telt op vanaf 0 alleen bij de allereerste mount -- de KPI-waarden komen uit
// live realtime state, dus zonder deze mount-gate zou elke realtime-update
// (iemand anders vinkt een taak af, een MRR-sync) de telling laten herstarten,
// wat afleidt in plaats van polijst.
function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = useState(target);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      const start = performance.now();
      let raf: number;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(target * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    setValue(target);
  }, [target, durationMs]);

  return value;
}

type OverviewProps =
  | {
      variant: "matthias";
      initialVentures: Venture[]; initialCrew: Crew[]; initialTasks: Task[]; initialTools: Tool[]; initialPayouts: Payout[];
      initialMrrSnapshots: MrrSnapshot[];
      lastActivityIso: string | null;
    }
  | {
      variant: "team";
      me: string;
      initialTasks: Task[]; initialCrew: Crew[]; initialWikiPages: WikiPage[]; initialVentures: Venture[];
    };

export function OverviewClient(props: OverviewProps) {
  return (
    <>
      <WorkflowCard />
      {props.variant === "matthias" ? <MatthiasOverview {...props} /> : <TeamOverview {...props} />}
    </>
  );
}

// Zichtbaar voor élke rol, ongewijzigd t.o.v. het oude single-page dashboard --
// dat toonde deze kaart ook al ongeacht wie was ingelogd, dus die zichtbaarheid
// mag door deze migratie niet stilzwijgend versmallen tot alleen teamleden.
function WorkflowCard() {
  return (
    <div className="workflow-card">
      <div className="workflow-head">
        <span className="workflow-title">Werkwijze — voor &amp; na elke sessie</span>
        <span className="workflow-sub">Voor Seba en Laurens</span>
      </div>
      <div className="workflow-grid">
        <div>
          <div className="workflow-col-label">Voor je begint</div>
          <ol className="workflow-steps">
            <li><span className="workflow-num">1</span><span>Check <b>Voor jou</b> bij Taken — staat er iets klaar dat is doorgestuurd?</span></li>
            <li><span className="workflow-num">2</span><span>Bekijk Squad Status voor nieuwe instructies van Matthias.</span></li>
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
        <p><b>Eén map per programma.</b> Noem je projectmap exact zoals de venture heet (bv. <code>tendertox</code>, <code>suppliersync</code>) — geen extra tekst zoals &quot;voor seba&quot;, geen submappen. Het Agent Dashboard toont de mapnaam automatisch als projectnaam, dus alleen zo klopt wat Matthias daar ziet.</p>
      </div>
    </div>
  );
}

function MatthiasOverview(props: {
  initialVentures: Venture[]; initialCrew: Crew[]; initialTasks: Task[]; initialTools: Tool[]; initialPayouts: Payout[];
  initialMrrSnapshots: MrrSnapshot[]; lastActivityIso: string | null;
}) {
  const [ventures, setVentures] = useState(props.initialVentures);
  const [crew, setCrew] = useState(props.initialCrew);
  const [tasks, setTasks] = useState(props.initialTasks);
  const [tools, setTools] = useState(props.initialTools);
  const [payouts, setPayouts] = useState(props.initialPayouts);
  const [mrrSnapshots, setMrrSnapshots] = useState(props.initialMrrSnapshots);
  const [now, setNow] = useState(Date.now());
  const [selectedVentureId, setSelectedVentureId] = useState<string | null>(null);
  const [editMrrVentureId, setEditMrrVentureId] = useState<string | null>(null);
  const [syncingMrr, setSyncingMrr] = useState(false);

  // Enige plek die nog een seconde-tikkende klok nodig heeft (72u sprint-klok) --
  // andere pagina's (bv. Taken) hadden deze nooit echt nodig voor hun dag-precisie checks.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const refetchVentures = () => supabaseBrowser.from("ventures").select("*").then(({ data }) => data && setVentures(data as Venture[]));
    const refetchCrew = () => supabaseBrowser.from("crew").select("*").order("rank").then(({ data }) => data && setCrew(data as Crew[]));
    const refetchTasks = () => supabaseBrowser.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => data && setTasks(data as Task[]));
    const refetchTools = () => supabaseBrowser.from("tools").select("*").order("name").then(({ data }) => data && setTools(data as Tool[]));
    const refetchPayouts = () => supabaseBrowser.from("payouts").select("*").order("paid_at", { ascending: false }).then(({ data }) => data && setPayouts(data as Payout[]));
    const refetchMrrSnapshots = () => supabaseBrowser.from("mrr_snapshots").select("*").order("captured_at", { ascending: true }).limit(2000).then(({ data }) => data && setMrrSnapshots(data as MrrSnapshot[]));
    const channel = supabaseBrowser
      .channel("flowsys-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "ventures" }, refetchVentures)
      .on("postgres_changes", { event: "*", schema: "public", table: "crew" }, refetchCrew)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetchTasks)
      .on("postgres_changes", { event: "*", schema: "public", table: "tools" }, refetchTools)
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, refetchPayouts)
      .on("postgres_changes", { event: "*", schema: "public", table: "mrr_snapshots" }, refetchMrrSnapshots)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

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

  const bottleneckCount = crew.filter((c) => c.status === "bottleneck").length;
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;
  const animatedMrr = useCountUp(totalMrr);
  const animatedOpenTasks = useCountUp(openTaskCount);
  const animatedBottlenecks = useCountUp(bottleneckCount);
  const activeTools = tools.filter((t) => t.status === "active");
  const nextRenewal = [...activeTools].filter((t) => t.renews_on).sort((a, b) => (a.renews_on! < b.renews_on! ? -1 : 1))[0] ?? null;
  // "Alles wat met geld te maken heeft" op één plek, i.p.v. moeten doorklikken naar
  // Tools en Uitbetalingen om het volledige financiële plaatje samen te vissen.
  const monthlyToolsCost = activeTools.reduce((s, t) => s + (t.billing_cycle === "jaarlijks" ? t.cost / 12 : t.billing_cycle === "maandelijks" ? t.cost : 0), 0);
  const oneTimeTools = tools.filter((t) => t.billing_cycle === "eenmalig");
  const oneTimeToolsCost = oneTimeTools.reduce((s, t) => s + t.cost, 0);
  const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);
  // Eén datapunt laten opvallen i.p.v. overal kleur -- zelfde spaarzame
  // accent-highlight die op mobit.framer.website één balk in een staafdiagram
  // liet opvallen, hier de venture met de hoogste MRR.
  const topMrrVenture = [...ventures].sort((a, b) => b.mrr - a.mrr)[0];
  const topMrrVentureId = topMrrVenture && topMrrVenture.mrr > 0 ? topMrrVenture.id : null;

  async function saveMrr(ventureId: string, val: number) {
    await post("/api/venture", { id: ventureId, mrr: val });
    setEditMrrVentureId(null);
  }
  async function resetSprint() {
    if (!clockVenture) { window.alert("Selecteer eerst een venture."); return; }
    await post("/api/venture", { id: clockVenture.id, resetSprintHours: 72, sprintLabel: clockVenture.sprint_label || clockVenture.name });
  }
  async function syncMrr() {
    setSyncingMrr(true);
    await fetch("/api/mrr-sync", { method: "POST" }).catch(() => {});
    setSyncingMrr(false);
  }

  return (
    <>
      <p className="section-sub">Laatste activiteit: <b>{relTime(props.lastActivityIso)}</b></p>

      <div className="section-head"><span className="section-title">Overzicht</span></div>
      <motion.div className="telemetry cols-2" variants={staggerContainerVariants} initial="hidden" animate="show">
        <TiltCard className="tile" variants={staggerItemVariants}>
          <div className="tile-label"><span>Holding MRR</span></div>
          <div className="tile-value">{fmtEUR(animatedMrr)}
            {totalMrrPrev > 0 && <span className={"tile-delta " + (totalMrrPrev <= totalMrr ? "up" : "down")}>{totalMrrPrev <= totalMrr ? "▲" : "▼"} {Math.abs(((totalMrr - totalMrrPrev) / totalMrrPrev) * 100).toFixed(1)}%</span>}
          </div>
          <div className="tile-foot">Som van {ventures.length} ventures</div>
        </TiltCard>
        <TiltCard className="tile" variants={staggerItemVariants}>
          <div className="tile-label"><span>Open taken</span></div>
          <div className="tile-value">{animatedOpenTasks}</div>
          <div className="tile-foot">bedrijfsbreed, alle ventures</div>
        </TiltCard>
        <TiltCard className={"tile" + (bottleneckCount > 0 ? " tile-urgent" : "")} variants={staggerItemVariants}>
          <div className="tile-label"><span>Bottlenecks</span></div>
          <div className={"tile-value" + (bottleneckCount > 0 ? " critical-color" : "")}>{animatedBottlenecks}</div>
          <div className="tile-foot">{bottleneckCount > 0 ? "wacht op oppak-actie" : "pipeline vrij"}</div>
        </TiltCard>
        <TiltCard className="tile" variants={staggerItemVariants}>
          <div className="tile-label"><span>Eerstvolgende tool-vervaldatum</span></div>
          <div className="tile-value" style={{ fontSize: 22 }}>{nextRenewal ? new Date(nextRenewal.renews_on!).toLocaleDateString("nl-BE") : "—"}</div>
          <div className="tile-foot">{nextRenewal ? nextRenewal.name : "niks gepland"}</div>
        </TiltCard>
      </motion.div>

      <div className="section-head"><span className="section-title">Financieel</span></div>
      <p className="section-sub">Alles wat met geld te maken heeft, in één oogopslag</p>
      <motion.div className="telemetry" variants={staggerContainerVariants} initial="hidden" animate="show">
        <TiltCard className="tile" variants={staggerItemVariants}>
          <div className="tile-label"><span>Tool-kosten / maand</span></div>
          <div className="tile-value">{fmtEUR(monthlyToolsCost)}</div>
          <div className="tile-foot">{activeTools.length} actieve {activeTools.length === 1 ? "tool" : "tools"} · <Link href="/tools" style={{ color: "var(--accent)" }}>bekijk →</Link></div>
        </TiltCard>
        <TiltCard className="tile" variants={staggerItemVariants}>
          <div className="tile-label"><span>Eenmalige betalingen</span></div>
          <div className="tile-value">{fmtEUR(oneTimeToolsCost)}</div>
          <div className="tile-foot">{oneTimeTools.length} eenmalige {oneTimeTools.length === 1 ? "betaling" : "betalingen"} · <Link href="/tools" style={{ color: "var(--accent)" }}>bekijk →</Link></div>
        </TiltCard>
        <TiltCard className="tile" variants={staggerItemVariants}>
          <div className="tile-label"><span>Totaal uitbetaald</span></div>
          <div className="tile-value">{fmtEUR(totalPayouts)}</div>
          <div className="tile-foot">{payouts.length} {payouts.length === 1 ? "uitbetaling" : "uitbetalingen"} gelogd · <Link href="/uitbetalingen" style={{ color: "var(--accent)" }}>bekijk →</Link></div>
        </TiltCard>
      </motion.div>

      <div className="section-head"><span className="section-title">Omzet in detail</span></div>
      <p className="section-sub">MRR per venture over tijd — hover voor exacte cijfers per dag, klik een naam om 'm tijdelijk te verbergen</p>
      <RevenueChart snapshots={mrrSnapshots} ventures={ventures} />

      <div className="section-head"><span className="section-title">Alles-oké? — Venture Overzicht</span></div>
      <p className="section-sub">Klik een venture om de rest van deze pagina daarop te focussen{selectedVenture ? " — klik nogmaals om te wissen" : ""}</p>
      <motion.div className="venture-strip" variants={staggerContainerVariants} initial="hidden" animate="show">
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
            <TiltCard
              as="button" key={v.id}
              className={`venture-chip ${cls} ${selectedVentureId === v.id ? "selected" : ""} ${v.id === topMrrVentureId ? "striped-accent" : ""}`}
              variants={staggerItemVariants}
              onClick={() => setSelectedVentureId(selectedVentureId === v.id ? null : v.id)}
            >
              <div className="vc-name">{v.name}</div>
              <div className="vc-stage">{STAGE_LABEL[v.stage]}</div>
              {v.mrr > 0 && <div className="vc-mrr">{fmtEUR(v.mrr)}{v.mrr_source_url && <span className="vc-live">live</span>}</div>}
              <div className="vc-status-label">{label}</div>
              <div className="vc-who">{workers.length ? workers.map((w) => w.name).join(", ") : "niemand actief"}</div>
            </TiltCard>
          );
        })}
      </motion.div>

      <div className="section-head"><span className="section-title">Telemetrie{selectedVenture ? ` — ${selectedVenture.name}` : ""}</span></div>
      <p className="section-sub">{selectedVenture ? "MRR van deze venture" : "Holding-MRR — som van alle dochterbedrijven"}</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedVentureId ?? "all"}
          className="telemetry"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <TiltCard className="tile">
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
          </TiltCard>
          <TiltCard className="tile">
            <div className="tile-label"><span>Projected Exit Waardering</span></div>
            <div className="tile-value accent-color">{fmtEUR(exit)}</div>
            <div className="tile-foot">MRR × <b>4.5</b> multiple</div>
          </TiltCard>
          <TiltCard className={"tile" + (urgent ? " tile-urgent striped-accent" : "")}>
            <div className="tile-label"><span>72u Sprint Klok</span></div>
            <div className={"tile-value" + (urgent ? " critical-color" : "")}>{clockText}</div>
            <div className="tile-foot">{clockFoot}<button className="btn ghost" style={{ marginLeft: "auto" }} onClick={resetSprint}>Start nieuwe 72u sprint</button></div>
          </TiltCard>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function TeamOverview(props: { me: string; initialTasks: Task[]; initialCrew: Crew[]; initialWikiPages: WikiPage[]; initialVentures: Venture[] }) {
  const [tasks, setTasks] = useState(props.initialTasks);
  const [crew, setCrew] = useState(props.initialCrew);
  const [wikiPages, setWikiPages] = useState(props.initialWikiPages);
  const [ventures] = useState(props.initialVentures);
  const me = props.me;

  useEffect(() => {
    const refetchTasks = () => supabaseBrowser.from("tasks").select("*").eq("assigned_to", me).order("created_at", { ascending: false }).then(({ data }) => data && setTasks(data as Task[]));
    const refetchCrew = () => supabaseBrowser.from("crew").select("*").order("rank").then(({ data }) => data && setCrew(data as Crew[]));
    const refetchWiki = () => supabaseBrowser.from("wiki_pages").select("*").order("updated_at", { ascending: false }).limit(3).then(({ data }) => data && setWikiPages(data as WikiPage[]));
    const channel = supabaseBrowser
      .channel("flowsys-overview-team")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetchTasks)
      .on("postgres_changes", { event: "*", schema: "public", table: "crew" }, refetchCrew)
      .on("postgres_changes", { event: "*", schema: "public", table: "wiki_pages" }, refetchWiki)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [me]);

  const ventureName = (id: string | null) => (id ? ventures.find((v) => v.id === id)?.name ?? id : null);
  const owner = crew.find((c) => c.status === "bottleneck");

  return (
    <>
      <div className="section-head"><span className="section-title">Voor jou</span></div>
      <ForYouList tasks={tasks} me={me} ventureName={ventureName} />

      <div className="section-head"><span className="section-title">Squad Status</span></div>
      {owner ? (
        <div className="owner-bar">⚠ Huidige code-eigenaar: <strong>{owner.name}</strong>{owner.note ? <> — <code>{owner.note}</code></> : null}</div>
      ) : (
        <div className="owner-bar none">✓ Geen actieve bottleneck — pipeline vrij</div>
      )}
      <p className="section-sub"><Link href="/squad">Volledige Squad Status →</Link></p>

      <div className="section-head"><span className="section-title">Recent in Wiki</span></div>
      {wikiPages.length === 0 ? (
        <div className="col-empty">Nog geen pagina&apos;s.</div>
      ) : (
        <div className="col-body">
          {wikiPages.map((w) => (
            <div className="gitlog-line" key={w.id}>
              <span className="gl-time">{relTime(w.updated_at)}</span>
              <span>{w.title}</span>
            </div>
          ))}
        </div>
      )}
      <p className="section-sub"><Link href="/wiki">Volledige Wiki →</Link></p>
    </>
  );
}
