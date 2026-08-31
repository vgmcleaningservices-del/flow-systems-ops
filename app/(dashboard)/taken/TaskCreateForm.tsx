"use client";
import { useEffect, useState } from "react";
import type { Crew, TaskPriority, Venture } from "@/lib/dashboard-types";
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@/lib/dashboard-constants";

export function TaskCreateForm({ crew, ventures, defaultVentureId, onSubmit }: {
  crew: Crew[]; ventures: Venture[]; defaultVentureId: string | null;
  onSubmit: (body: { venture_id: string; title: string; description: string; assigned_to: string; priority: TaskPriority }) => Promise<boolean>;
}) {
  const [ventureId, setVentureId] = useState(defaultVentureId ?? ventures[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState(crew[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("normal");

  useEffect(() => { if (defaultVentureId) setVentureId(defaultVentureId); }, [defaultVentureId]);

  async function submit() {
    if (!title.trim()) return;
    const ok = await onSubmit({ venture_id: ventureId, title: title.trim(), description, assigned_to: assignedTo, priority });
    if (ok) { setTitle(""); setDescription(""); setPriority("normal"); }
  }

  return (
    <div className="form-inline">
      <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}>{ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <input className="field" placeholder="Titel van de taak" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="field" placeholder="omschrijving (optioneel)" value={description} onChange={(e) => setDescription(e.target.value)} />
      <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}</select>
      <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>{crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="btn primary" onClick={submit}>+ Taak aanmaken</button>
    </div>
  );
}
