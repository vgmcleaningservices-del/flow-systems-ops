"use client";
import { useState } from "react";
import type { Venture } from "@/lib/dashboard-types";

export function WikiCreateForm({ ventures, onSubmit }: {
  ventures: Venture[]; onSubmit: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [ventureId, setVentureId] = useState("");
  const [title, setTitle] = useState("");

  async function submit() {
    if (!title.trim()) return;
    const ok = await onSubmit({ title: title.trim(), venture_id: ventureId || null, content: "" });
    if (ok) setTitle("");
  }

  return (
    <div className="form-inline">
      <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}>
        <option value="">— algemeen —</option>
        {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <input className="field" placeholder="Titel van de pagina" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className="btn primary" onClick={submit}>+ Pagina aanmaken</button>
    </div>
  );
}
