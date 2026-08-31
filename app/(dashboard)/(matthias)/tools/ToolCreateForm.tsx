"use client";
import { useState } from "react";
import { ALL_PEOPLE } from "@/lib/people";
import type { BillingCycle } from "@/lib/dashboard-types";
import { TOOL_CATEGORIES, TOOL_CATEGORY_LABEL, BILLING_LABEL } from "@/lib/dashboard-constants";

export function ToolCreateForm({ onSubmit }: { onSubmit: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("overig");
  const [cost, setCost] = useState<number>(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("maandelijks");
  const [accountOwner, setAccountOwner] = useState("");

  async function submit() {
    if (!name.trim()) return;
    const ok = await onSubmit({ name: name.trim(), category, cost, billing_cycle: billingCycle, account_owner: accountOwner || null });
    if (ok) { setName(""); setCost(0); }
  }

  return (
    <div className="form-inline">
      <input className="field" placeholder="Naam (bv. Vercel)" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>{TOOL_CATEGORIES.map((c) => <option key={c} value={c}>{TOOL_CATEGORY_LABEL[c]}</option>)}</select>
      <input className="field" type="number" min={0} placeholder="kosten €" value={cost || ""} onChange={(e) => setCost(parseFloat(e.target.value || "0"))} style={{ maxWidth: 100 }} />
      <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}>{(Object.keys(BILLING_LABEL) as BillingCycle[]).map((b) => <option key={b} value={b}>{b}</option>)}</select>
      <select value={accountOwner} onChange={(e) => setAccountOwner(e.target.value)}><option value="">— beheerder —</option>{ALL_PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button className="btn primary" onClick={submit}>+ Tool toevoegen</button>
    </div>
  );
}
