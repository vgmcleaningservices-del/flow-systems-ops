"use client";
import { useState } from "react";
import { ALL_PEOPLE } from "@/lib/people";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [crewId, setCrewId] = useState("");
  const [personalCode, setPersonalCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const r1 = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!r1.ok) {
      setBusy(false);
      setError("Foute teamcode.");
      return;
    }

    if (!crewId) {
      setBusy(false);
      setError("Kies wie je bent.");
      return;
    }

    const r2 = await fetch("/api/auth/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crew_id: crewId, code: personalCode }),
    });
    setBusy(false);
    if (r2.ok) {
      // Plain client-side redirect — avoids next/navigation's useSearchParams,
      // which would otherwise force this page into a Suspense boundary at build time.
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.href = next;
    } else {
      setError("Foute naam/code-combinatie.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={submit} className="login-card">
        <div className="brand-mark">FLOW SYSTEMS</div>
        <div className="brand-sub">// Command Center — teamtoegang</div>
        <input
          className="field"
          type="password"
          placeholder="Teamcode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        <select value={crewId} onChange={(e) => setCrewId(e.target.value)}>
          <option value="">Wie ben jij?</option>
          {ALL_PEOPLE.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          className="field"
          type="password"
          placeholder="Jouw persoonlijke code"
          value={personalCode}
          onChange={(e) => setPersonalCode(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Bezig…" : "Inloggen"}
        </button>
        {error && <div className="login-error">{error}</div>}
      </form>
    </div>
  );
}
