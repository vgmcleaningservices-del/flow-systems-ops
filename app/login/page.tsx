"use client";
import { useState } from "react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (res.ok) {
      // Plain client-side redirect — avoids next/navigation's useSearchParams,
      // which would otherwise force this page into a Suspense boundary at build time.
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.href = next;
    } else {
      setError("Foute code.");
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
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Bezig…" : "Inloggen"}
        </button>
        {error && <div className="login-error">{error}</div>}
      </form>
    </div>
  );
}
