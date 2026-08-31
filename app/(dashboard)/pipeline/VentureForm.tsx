"use client";
import { useState } from "react";
import type { Crew, Stage, Venture } from "@/lib/dashboard-types";
import { STAGE_LABEL } from "@/lib/dashboard-constants";

export function VentureForm({ venture, crew, onCancel, onSave }: { venture: Venture; crew: Crew[]; onCancel: () => void; onSave: (patch: Partial<Venture>) => void }) {
  const [stage, setStage] = useState<Stage>(venture.stage);
  const [price, setPrice] = useState(venture.price);
  const [feature, setFeature] = useState(venture.feature);
  const [githubRepo, setGithubRepo] = useState(venture.github_repo ?? "");
  const [mrrSourceUrl, setMrrSourceUrl] = useState(venture.mrr_source_url ?? "");
  const [notionUrl, setNotionUrl] = useState(venture.notion_url ?? "");
  const [pitchedBy, setPitchedBy] = useState(venture.pitched_by ?? "");
  const [repo, setRepo] = useState(venture.repo_done);
  const [domein, setDomein] = useState(venture.domein_done);
  const [stripe, setStripe] = useState(venture.stripe_done);
  return (
    <div className="edit-form">
      <div><label>Fase</label>
        <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </div>
      <div><label>Prijs / potentieel</label><input className="field" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
      <div><label>Feature</label><input className="field" value={feature} onChange={(e) => setFeature(e.target.value)} /></div>
      <div><label>GitHub-repo (voor de webhook)</label><input className="field" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} placeholder="bv. suppliersync" /></div>
      <div><label>MRR-endpoint (voor live Stripe-sync)</label><input className="field" value={mrrSourceUrl} onChange={(e) => setMrrSourceUrl(e.target.value)} placeholder="bv. https://www.tendertox.com/api/mrr" /></div>
      <div><label>Notion-link (optioneel)</label><input className="field" value={notionUrl} onChange={(e) => setNotionUrl(e.target.value)} placeholder="https://notion.so/..." /></div>
      <div><label>Gepitcht door</label>
        <select value={pitchedBy} onChange={(e) => setPitchedBy(e.target.value)}>
          <option value="">— onbekend / House —</option>
          {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="checks">
        <label className="check-label"><input type="checkbox" checked={repo} onChange={(e) => setRepo(e.target.checked)} /> Repo</label>
        <label className="check-label"><input type="checkbox" checked={domein} onChange={(e) => setDomein(e.target.checked)} /> Domein</label>
        <label className="check-label"><input type="checkbox" checked={stripe} onChange={(e) => setStripe(e.target.checked)} /> Stripe</label>
      </div>
      <div className="edit-actions">
        <button className="btn primary" onClick={() => onSave({ stage, price, feature, github_repo: githubRepo || null, mrr_source_url: mrrSourceUrl || null, notion_url: notionUrl || null, pitched_by: pitchedBy || null, repo_done: repo, domein_done: domein, stripe_done: stripe })}>Opslaan</button>
        <button className="btn ghost" onClick={onCancel}>Annuleren</button>
      </div>
    </div>
  );
}
