"use client";
import { useState } from "react";
import type { Venture, WikiPage } from "@/lib/dashboard-types";

export function WikiPageForm({ page, ventures, onCancel, onSave }: {
  page: WikiPage; ventures: Venture[]; onCancel: () => void; onSave: (patch: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [ventureId, setVentureId] = useState(page.venture_id ?? "");
  return (
    <div className="edit-form">
      <div><label>Titel</label><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label>Venture</label>
        <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}>
          <option value="">— algemeen —</option>
          {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div><label>Inhoud — # kop, ## subkop, **vet**, - bullet</label>
        <textarea className="field" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <div className="edit-actions">
        <button className="btn primary" onClick={() => onSave({ title, content, venture_id: ventureId || null })}>Opslaan</button>
        <button className="btn ghost" onClick={onCancel}>Annuleren</button>
      </div>
    </div>
  );
}
