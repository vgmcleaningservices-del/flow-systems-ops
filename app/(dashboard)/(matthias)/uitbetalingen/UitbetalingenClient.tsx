"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Crew, Payout, Venture } from "@/lib/dashboard-types";
import { fmtEUR } from "@/lib/dashboard-format";
import { PayoutForm } from "./PayoutForm";

export function UitbetalingenClient(props: { initialMeName: string; initialVentures: Venture[]; initialCrew: Crew[]; initialPayouts: Payout[] }) {
  const [ventures, setVentures] = useState(props.initialVentures);
  const [crew, setCrew] = useState(props.initialCrew);
  const [payouts, setPayouts] = useState(props.initialPayouts);

  useEffect(() => {
    const refetchVentures = () => supabaseBrowser.from("ventures").select("*").then(({ data }) => data && setVentures(data as Venture[]));
    const refetchCrew = () => supabaseBrowser.from("crew").select("*").order("rank").then(({ data }) => data && setCrew(data as Crew[]));
    const refetchPayouts = () => supabaseBrowser.from("payouts").select("*").order("paid_at", { ascending: false }).limit(50).then(({ data }) => data && setPayouts(data as Payout[]));
    const channel = supabaseBrowser
      .channel("flowsys-uitbetalingen")
      .on("postgres_changes", { event: "*", schema: "public", table: "ventures" }, refetchVentures)
      .on("postgres_changes", { event: "*", schema: "public", table: "crew" }, refetchCrew)
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, refetchPayouts)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  return (
    <>
      <div className="section-head"><span className="section-title">Uitbetalingen</span></div>
      <p className="section-sub">Alleen een overzicht — dit voert nooit zelf een betaling uit, jij betaalt en logt het hier</p>
      <div className="ledger-wrap">
        <table className="ledger-table">
          <thead><tr><th>Venture</th><th className="num">MRR</th><th>Gepitcht door</th><th className="num">Zende royalty (5%)</th><th className="num">House-aandeel</th></tr></thead>
          <tbody>
            {ventures.filter((v) => v.mrr > 0).map((v) => {
              const royalty = v.pitched_by === "zende" ? v.mrr * 0.05 : 0;
              return (
                <tr key={v.id}>
                  <td data-label="Venture">{v.name}</td>
                  <td className="num" data-label="MRR">{fmtEUR(v.mrr)}</td>
                  <td data-label="Gepitcht door">{crew.find((c) => c.id === v.pitched_by)?.name ?? "—"}</td>
                  <td className="num" data-label="Zende royalty (5%)">{royalty > 0 ? fmtEUR(royalty) : "—"}</td>
                  <td className="num" data-label="House-aandeel">{fmtEUR(v.mrr - royalty)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="gitlog" style={{ marginTop: 14 }}>
        <div className="gitlog-head">Uitbetalingslog</div>
        {payouts.length === 0 && <div className="gitlog-empty">Nog geen uitbetalingen gelogd.</div>}
        {payouts.map((p) => (
          <div className="gitlog-line" key={p.id}>
            <span className="gl-time">{new Date(p.paid_at).toLocaleDateString("nl-BE")}</span>
            <span>{crew.find((c) => c.id === p.crew_id)?.name ?? p.crew_id} — {fmtEUR(p.amount)}{p.note ? ` (${p.note})` : ""}</span>
            <span className="gl-pass">door {p.recorded_by}</span>
          </div>
        ))}
        <PayoutForm crew={crew} ventures={ventures} me={props.initialMeName} onSubmit={(body) => post("/api/payouts", body)} />
      </div>
    </>
  );
}
