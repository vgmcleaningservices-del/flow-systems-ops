"use client";
import { Fragment, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Tool } from "@/lib/dashboard-types";
import { PEOPLE_NAME, TOOL_CATEGORY_LABEL, BILLING_LABEL } from "@/lib/dashboard-constants";
import { fmtEUR } from "@/lib/dashboard-format";
import { staggerContainerVariants, staggerItemVariants } from "../../_components/motion";
import { ToolForm } from "./ToolForm";
import { ToolCreateForm } from "./ToolCreateForm";

export function ToolsClient(props: { initialTools: Tool[] }) {
  const [tools, setTools] = useState(props.initialTools);
  const [editToolId, setEditToolId] = useState<number | null>(null);

  useEffect(() => {
    const refetch = () => supabaseBrowser.from("tools").select("*").order("name").then(({ data }) => data && setTools(data as Tool[]));
    const channel = supabaseBrowser
      .channel("flowsys-tools")
      .on("postgres_changes", { event: "*", schema: "public", table: "tools" }, refetch)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  const activeTools = tools.filter((t) => t.status === "active");
  const monthlyToolsCost = activeTools.reduce((s, t) => s + (t.billing_cycle === "jaarlijks" ? t.cost / 12 : t.billing_cycle === "maandelijks" ? t.cost : 0), 0);
  const nextRenewal = [...activeTools].filter((t) => t.renews_on).sort((a, b) => (a.renews_on! < b.renews_on! ? -1 : 1))[0] ?? null;

  async function createTool(body: Record<string, unknown>) {
    return post("/api/tools", body);
  }
  async function saveTool(t: Tool, patch: Record<string, unknown>) {
    await post(`/api/tools/${t.id}`, patch);
    setEditToolId(null);
  }

  return (
    <>
      <div className="section-head"><span className="section-title">Tools &amp; Abonnementen</span></div>
      <p className="section-sub">Alle programma&apos;s en diensten die Flow Systems gebruikt, op één plek</p>
      <motion.div className="telemetry cols-2" style={{ marginBottom: 16 }} variants={staggerContainerVariants} initial="hidden" animate="show">
        <motion.div className="tile" variants={staggerItemVariants}>
          <div className="tile-label"><span>Totaal / maand</span></div>
          <div className="tile-value">{fmtEUR(monthlyToolsCost)}</div>
          <div className="tile-foot">{activeTools.length} actieve {activeTools.length === 1 ? "tool" : "tools"}</div>
        </motion.div>
        <motion.div className="tile" variants={staggerItemVariants}>
          <div className="tile-label"><span>Eerstvolgende vervaldatum</span></div>
          <div className="tile-value" style={{ fontSize: 22 }}>{nextRenewal ? new Date(nextRenewal.renews_on!).toLocaleDateString("nl-BE") : "—"}</div>
          <div className="tile-foot">{nextRenewal ? nextRenewal.name : "niks gepland"}</div>
        </motion.div>
      </motion.div>
      <div className="ledger-wrap">
        <table className="ledger-table">
          <thead>
            <tr><th>Naam</th><th className="num">Kosten</th><th>Vervalt</th><th>Beheerder</th><th></th></tr>
          </thead>
          <motion.tbody variants={staggerContainerVariants} initial="hidden" animate="show">
            {tools.map((t) => (
              <Fragment key={t.id}>
                <motion.tr style={{ opacity: t.status === "cancelled" ? 0.5 : 1 }} variants={staggerItemVariants}>
                  <td data-label="Naam">
                    <div style={{ fontWeight: 600, color: "var(--text)" }}>{t.name}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                      <span className="task-venture-badge">{TOOL_CATEGORY_LABEL[t.category] ?? t.category}</span>
                      {t.status === "cancelled" && <span className="task-venture-badge">Geannuleerd</span>}
                      {t.url && <a href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "var(--accent)" }}>Open →</a>}
                    </div>
                  </td>
                  <td className="num" data-label="Kosten">{t.cost > 0 ? `${fmtEUR(t.cost)} ${BILLING_LABEL[t.billing_cycle]}` : "gratis"}</td>
                  <td data-label="Vervalt">{t.renews_on ? new Date(t.renews_on).toLocaleDateString("nl-BE") : "—"}</td>
                  <td data-label="Beheerder">{t.account_owner ? (PEOPLE_NAME[t.account_owner] ?? t.account_owner) : "—"}</td>
                  <td style={{ textAlign: "right" }}><button className="icon-btn" onClick={() => setEditToolId(editToolId === t.id ? null : t.id)} aria-label="Bewerk">✎</button></td>
                </motion.tr>
                {editToolId === t.id && (
                  <tr>
                    <td colSpan={5}>
                      {/* Tabel-layout reflowt de hele tabel op elk animatieframe, dus
                          hier bewust alleen een opacity-fade i.p.v. een hoogte-animatie
                          (die bij Pipeline/Taken/Wiki wel via AnimatedDisclosure loopt). */}
                      <AnimatePresence>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                          <ToolForm tool={t} onCancel={() => setEditToolId(null)} onSave={(patch) => saveTool(t, patch)} />
                        </motion.div>
                      </AnimatePresence>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {tools.length === 0 && <tr><td colSpan={5} style={{ fontStyle: "italic", color: "var(--text-faint)" }}>Nog niks toegevoegd.</td></tr>}
          </motion.tbody>
        </table>
      </div>
      <ToolCreateForm onSubmit={createTool} />
    </>
  );
}
