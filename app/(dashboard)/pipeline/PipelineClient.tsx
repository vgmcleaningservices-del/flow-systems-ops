"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Crew, Venture } from "@/lib/dashboard-types";
import { STAGE_LABEL } from "@/lib/dashboard-constants";
import { pad } from "@/lib/dashboard-format";
import { VentureForm } from "./VentureForm";

export function PipelineClient(props: { initialVentures: Venture[]; initialCrew: Crew[] }) {
  const [ventures, setVentures] = useState(props.initialVentures);
  const [crew, setCrew] = useState(props.initialCrew);
  const [openVentureId, setOpenVentureId] = useState<string | null>(null);
  const [editVentureId, setEditVentureId] = useState<string | null>(null);

  useEffect(() => {
    const refetchVentures = () => supabaseBrowser.from("ventures").select("*").then(({ data }) => data && setVentures(data as Venture[]));
    const refetchCrew = () => supabaseBrowser.from("crew").select("*").order("rank").then(({ data }) => data && setCrew(data as Crew[]));
    const channel = supabaseBrowser
      .channel("flowsys-pipeline")
      .on("postgres_changes", { event: "*", schema: "public", table: "ventures" }, refetchVentures)
      .on("postgres_changes", { event: "*", schema: "public", table: "crew" }, refetchCrew)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  async function saveVenture(v: Venture, patch: Partial<Venture>) {
    await post("/api/venture", { id: v.id, ...patch });
    setEditVentureId(null);
  }

  return (
    <>
      <div className="section-head"><span className="section-title">App Pipeline</span></div>
      <p className="section-sub">M&amp;A-pipeline, van scouting tot exit-isolatie</p>
      <div className="pipeline">
        {(["scouting", "sprint", "exit-ready"] as const).map((stage, idx) => (
          <div key={stage}>
            <div className="col-head"><b>{pad(idx + 1)}</b> {STAGE_LABEL[stage]}</div>
            <div className="col-body">
              {ventures.filter((v) => v.stage === stage).map((v) => (
                <div className="app-card" key={v.id}>
                  <div className="app-head" onClick={() => setOpenVentureId(openVentureId === v.id ? null : v.id)}>
                    <span className="app-name-row"><span className="app-name">{v.name}</span>{v.stage === "sprint" && <span className="app-badge">In Productie</span>}</span>
                    <span className={"chev" + (openVentureId === v.id ? " open" : "")}>⌄</span>
                  </div>
                  {openVentureId === v.id && (
                    editVentureId === v.id ? (
                      <VentureForm venture={v} crew={crew} onCancel={() => setEditVentureId(null)} onSave={(patch) => saveVenture(v, patch)} />
                    ) : (
                      <div className="detail-inner">
                        <div className="detail-row"><span>Prijs / potentieel</span><span>{v.price}</span></div>
                        {v.feature && <div className="detail-row"><span>Feature</span><span>{v.feature}</span></div>}
                        {v.pitched_by && <div className="detail-row"><span>Gepitcht door</span><span>{crew.find((c) => c.id === v.pitched_by)?.name ?? v.pitched_by}</span></div>}
                        {v.notion_url && <div className="detail-row"><span>Notities</span><span><a href={v.notion_url} target="_blank" rel="noreferrer">Open in Notion →</a></span></div>}
                        <div className="isolation">
                          <span className={"iso-item " + (v.repo_done ? "done" : "pending")}>{v.repo_done ? "●" : "○"} Repo</span>
                          <span className={"iso-item " + (v.domein_done ? "done" : "pending")}>{v.domein_done ? "●" : "○"} Domein</span>
                          <span className={"iso-item " + (v.stripe_done ? "done" : "pending")}>{v.stripe_done ? "●" : "○"} Stripe</span>
                        </div>
                        <div className="edit-actions" style={{ marginTop: 10 }}><button className="btn" onClick={() => setEditVentureId(v.id)}>Bewerken</button></div>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
