"use client";
import { useState } from "react";
import { ALL_PEOPLE } from "@/lib/people";
import type { BillingCycle, Tool, ToolStatus } from "@/lib/dashboard-types";
import { TOOL_CATEGORIES, TOOL_CATEGORY_LABEL, BILLING_LABEL } from "@/lib/dashboard-constants";

export function ToolForm({ tool, onCancel, onSave }: {
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
