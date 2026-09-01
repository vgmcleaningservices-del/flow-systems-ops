"use client";
import { useEffect, useState } from "react";
import * as motion from "motion/react-client";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { Stage, Venture } from "@/lib/dashboard-types";
import { STAGE_LABEL } from "@/lib/dashboard-constants";
import { fmtEUR } from "@/lib/dashboard-format";
import { AnimatedDisclosure, staggerContainerVariants, staggerItemVariants, TiltCard } from "../_components/motion";

const STAGE_ORDER: Stage[] = ["scouting", "sprint", "exit-ready"];
const STAGE_COLOR: Record<Stage, string> = { scouting: "var(--idle)", sprint: "var(--accent)", "exit-ready": "var(--good)" };

export function ProgrammasClient(props: { initialVentures: Venture[] }) {
  const [ventures, setVentures] = useState(props.initialVentures);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const refetch = () => supabaseBrowser.from("ventures").select("*").then(({ data }) => data && setVentures(data as Venture[]));
    const channel = supabaseBrowser
      .channel("flowsys-programmas")
      .on("postgres_changes", { event: "*", schema: "public", table: "ventures" }, refetch)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  return (
    <>
      <div className="section-head"><span className="section-title">Programma&apos;s</span></div>
      <p className="section-sub">Wat elk dochterbedrijf precies doet en hoe het werkt — klik een naam voor de volledige uitleg</p>

      {STAGE_ORDER.map((stage) => {
        const inStage = ventures.filter((v) => v.stage === stage);
        if (inStage.length === 0) return null;
        return (
          <div key={stage}>
            <div className="section-head" style={{ margin: "32px 0 8px" }}>
              <span className="section-title" style={{ fontSize: "var(--text-lg)" }}>{STAGE_LABEL[stage]}</span>
            </div>
            <motion.div className="col-body" variants={staggerContainerVariants} initial="hidden" animate="show">
              {inStage.map((v) => (
                <TiltCard className="app-card" key={v.id} style={{ borderLeft: `3px solid ${STAGE_COLOR[v.stage]}` }} variants={staggerItemVariants}>
                  <div className="app-head" onClick={() => setOpenId(openId === v.id ? null : v.id)}>
                    <span className="app-name-row">
                      <span className="app-name">{v.name}</span>
                      {v.mrr > 0 && <span className="task-venture-badge">{fmtEUR(v.mrr)} MRR</span>}
                    </span>
                    <span className={"chev" + (openId === v.id ? " open" : "")}>⌄</span>
                  </div>
                  {v.feature && <p className="section-sub" style={{ margin: "4px 0 0" }}>{v.feature}</p>}
                  <AnimatedDisclosure open={openId === v.id}>
                    <div className="detail-inner">
                      <div className="wiki-content">
                        {v.long_description || "Concept — nog niet uitgewerkt. Zodra de scope vastligt komt de volledige uitleg hier te staan."}
                      </div>
                    </div>
                  </AnimatedDisclosure>
                </TiltCard>
              ))}
            </motion.div>
          </div>
        );
      })}
    </>
  );
}
