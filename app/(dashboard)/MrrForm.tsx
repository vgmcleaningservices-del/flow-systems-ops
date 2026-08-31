"use client";
import { useState } from "react";

export function MrrForm({ initial, onCancel, onSave }: { initial: number; onCancel: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="edit-form">
      <input className="field" type="number" min={0} value={v} onChange={(e) => setV(parseInt(e.target.value || "0", 10))} />
      <div className="edit-actions"><button className="btn primary" onClick={() => onSave(v)}>Opslaan</button><button className="btn ghost" onClick={onCancel}>Annuleren</button></div>
    </div>
  );
}
