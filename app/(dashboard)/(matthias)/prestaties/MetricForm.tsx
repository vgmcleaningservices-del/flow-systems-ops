"use client";
import { useState } from "react";
import type { Crew, Venture } from "@/lib/dashboard-types";
import { METRIC_LABELS } from "@/lib/dashboard-constants";

export function MetricForm({ crew, ventures, defaultPeriod, onSubmit }: {
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
