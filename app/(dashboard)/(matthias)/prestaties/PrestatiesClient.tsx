"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Crew, CrewEvent, CommitRow, Metric, Venture } from "@/lib/dashboard-types";
import { METRIC_LABELS } from "@/lib/dashboard-constants";
import { isoWeek } from "@/lib/dashboard-format";
import { MetricForm } from "./MetricForm";

export function PrestatiesClient(props: {
  initialCrew: Crew[]; initialVentures: Venture[]; initialCommits: CommitRow[]; initialCrewEvents: CrewEvent[]; initialMetrics: Metric[];
}) {
  const [crew, setCrew] = useState(props.initialCrew);
  const [ventures] = useState(props.initialVentures);
  const [commits, setCommits] = useState(props.initialCommits);
  const [crewEvents, setCrewEvents] = useState(props.initialCrewEvents);
  const [metrics, setMetrics] = useState(props.initialMetrics);

  useEffect(() => {
    const refetchCrew = () => supabaseBrowser.from("crew").select("*").order("rank").then(({ data }) => data && setCrew(data as Crew[]));
    const refetchCommits = () => supabaseBrowser.from("commits").select("*").order("ts", { ascending: false }).limit(200).then(({ data }) => data && setCommits(data as CommitRow[]));
    const refetchCrewEvents = () => supabaseBrowser.from("crew_events").select("*").order("ts", { ascending: false }).limit(200).then(({ data }) => data && setCrewEvents(data as CrewEvent[]));
    const refetchMetrics = () => supabaseBrowser.from("metrics").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => data && setMetrics(data as Metric[]));
    const channel = supabaseBrowser
      .channel("flowsys-prestaties")
      .on("postgres_changes", { event: "*", schema: "public", table: "crew" }, refetchCrew)
      .on("postgres_changes", { event: "*", schema: "public", table: "commits" }, refetchCommits)
      .on("postgres_changes", { event: "*", schema: "public", table: "crew_events" }, refetchCrewEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "metrics" }, refetchMetrics)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

  return (
    <>
      <div className="section-head"><span className="section-title">Prestaties</span></div>
      <p className="section-sub">Commits uit Git zijn automatisch; outreach/scouting log je handmatig hieronder</p>
      <div className="perf-grid">
        {crew.map((c) => {
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
    </>
  );
}
