"use client";
import { useEffect, useState } from "react";
import * as motion from "motion/react-client";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Venture, WikiPage } from "@/lib/dashboard-types";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { relTime, renderWikiContent } from "@/lib/dashboard-format";
import { AnimatedDisclosure, staggerContainerVariants, staggerItemVariants, TiltCard } from "../_components/motion";
import { WikiPageForm } from "./WikiPageForm";
import { WikiCreateForm } from "./WikiCreateForm";

export function WikiClient(props: { initialMe: string; initialWikiPages: WikiPage[]; initialVentures: Venture[] }) {
  const [wikiPages, setWikiPages] = useState(props.initialWikiPages);
  const [ventures] = useState(props.initialVentures);
  const [openWikiId, setOpenWikiId] = useState<number | null>(null);
  const [editWikiId, setEditWikiId] = useState<number | null>(null);

  useEffect(() => {
    const refetch = () => supabaseBrowser.from("wiki_pages").select("*").order("updated_at", { ascending: false }).then(({ data }) => data && setWikiPages(data as WikiPage[]));
    const channel = supabaseBrowser
      .channel("flowsys-wiki")
      .on("postgres_changes", { event: "*", schema: "public", table: "wiki_pages" }, refetch)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  const ventureName = (id: string | null) => (id ? ventures.find((v) => v.id === id)?.name ?? id : null);

  async function createWiki(body: Record<string, unknown>) {
    return post("/api/wiki", body);
  }
  async function saveWiki(w: WikiPage, patch: Record<string, unknown>) {
    await post(`/api/wiki/${w.id}`, patch);
    setEditWikiId(null);
  }
  async function deleteWiki(w: WikiPage) {
    if (!window.confirm(`"${w.title}" verwijderen?`)) return;
    await fetch(`/api/wiki/${w.id}`, { method: "DELETE" });
    setOpenWikiId(null);
  }

  return (
    <>
      <div className="section-head"><span className="section-title">Wiki</span></div>
      <p className="section-sub">Gedeelde kennisbank — algemene pagina&apos;s of per venture</p>
      <motion.div className="col-body" variants={staggerContainerVariants} initial="hidden" animate="show">
        {wikiPages.map((w) => (
          <TiltCard className="app-card" key={w.id} variants={staggerItemVariants}>
            <div className="app-head" onClick={() => setOpenWikiId(openWikiId === w.id ? null : w.id)}>
              <span className="app-name-row">
                <span className="app-name">{w.title}</span>
                <span className="task-venture-badge">{w.venture_id ? ventureName(w.venture_id) : "Algemeen"}</span>
              </span>
              <span className={"chev" + (openWikiId === w.id ? " open" : "")}>⌄</span>
            </div>
            <AnimatedDisclosure open={openWikiId === w.id}>
              {editWikiId === w.id ? (
                <WikiPageForm page={w} ventures={ventures} onCancel={() => setEditWikiId(null)} onSave={(patch) => saveWiki(w, patch)} />
              ) : (
                <div className="detail-inner">
                  <div className="wiki-content">{renderWikiContent(w.content)}</div>
                  <div className="detail-row"><span>Laatst bijgewerkt</span><span>{relTime(w.updated_at)}{w.updated_by ? ` · ${PEOPLE_NAME[w.updated_by] ?? w.updated_by}` : ""}</span></div>
                  <div className="edit-actions" style={{ marginTop: 10 }}>
                    <button className="btn" onClick={() => setEditWikiId(w.id)}>Bewerken</button>
                    <button className="btn ghost" onClick={() => deleteWiki(w)}>Verwijderen</button>
                  </div>
                </div>
              )}
            </AnimatedDisclosure>
          </TiltCard>
        ))}
        {wikiPages.length === 0 && <div className="col-empty">Nog geen pagina&apos;s.</div>}
      </motion.div>
      <WikiCreateForm ventures={ventures} onSubmit={createWiki} />
    </>
  );
}
