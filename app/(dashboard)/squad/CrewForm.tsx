"use client";
import { useState } from "react";
import type { Crew, CrewStatus, Venture } from "@/lib/dashboard-types";
import { STATUS_LABEL } from "@/lib/dashboard-constants";

export function CrewForm({ crew, ventures, onCancel, onSave }: { crew: Crew; ventures: Venture[]; onCancel: () => void; onSave: (status: CrewStatus, task: string, note: string, ventureId: string | null) => void }) {
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
