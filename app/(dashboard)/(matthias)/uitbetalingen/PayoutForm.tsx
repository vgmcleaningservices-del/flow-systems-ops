"use client";
import { useState } from "react";
import type { Crew, Venture } from "@/lib/dashboard-types";

export function PayoutForm({ crew, ventures, me, onSubmit }: {
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
