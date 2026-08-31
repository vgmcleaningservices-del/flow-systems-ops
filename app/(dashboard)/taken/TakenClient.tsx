"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { Crew, Task, TaskPriority, TaskStatus, Venture } from "@/lib/dashboard-types";
import { TASK_STATUSES, TASK_STATUS_LABEL, TASK_COLOR, TASK_PRIORITIES, TASK_PRIORITY_LABEL, TASK_PRIORITY_TAG, PEOPLE_NAME } from "@/lib/dashboard-constants";
import { pad, relTime } from "@/lib/dashboard-format";
import { ForYouList } from "../_components/ForYouList";
import { TaskForm } from "./TaskForm";
import { TaskCreateForm } from "./TaskCreateForm";

export function TakenClient(props: { initialMe: string; initialTasks: Task[]; initialCrew: Crew[]; initialVentures: Venture[] }) {
  const [tasks, setTasks] = useState(props.initialTasks);
  const [crew] = useState(props.initialCrew);
  const [ventures] = useState(props.initialVentures);
  const me = props.initialMe;

  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [taskFilterVenture, setTaskFilterVenture] = useState<string | null>(null);
  const [taskFilterAssignee, setTaskFilterAssignee] = useState("");
  const [taskFilterPriority, setTaskFilterPriority] = useState<TaskPriority | "">("");
  const [taskFilterOverdue, setTaskFilterOverdue] = useState(false);
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    const refetch = () => supabaseBrowser.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => data && setTasks(data as Task[]));
    const channel = supabaseBrowser
      .channel("flowsys-taken")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  const ventureName = (id: string | null) => (id ? ventures.find((v) => v.id === id)?.name ?? id : null);
  // Geen ticking klok meer nodig -- een dag-vergelijking voor overdue/due-soon
  // heeft geen seconde-precisie nodig, dus dit wordt eenmalig per render berekend.
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueSoonCutoff = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  const visibleTasks = taskFilterVenture ? tasks.filter((t) => t.venture_id === taskFilterVenture) : tasks;
  // Filters gelden alleen voor het bord -- "Voor jou" blijft altijd ongefilterd
  // (dat is al impliciet "van mij"), en subtaken concurreren niet om kolomruimte.
  const boardTasks = visibleTasks
    .filter((t) => !t.parent_task_id)
    .filter((t) => !taskFilterAssignee || t.assigned_to === taskFilterAssignee)
    .filter((t) => !taskFilterPriority || t.priority === taskFilterPriority)
    .filter((t) => !taskFilterOverdue || (!!t.due_date && t.due_date < todayStr && t.status !== "done"));

  async function createTask(body: { venture_id: string; title: string; description: string; assigned_to: string; priority: TaskPriority }) {
    return post("/api/tasks", body);
  }
  async function saveTask(t: Task, patch: { title?: string; description?: string; status?: TaskStatus; assigned_to?: string; priority?: TaskPriority; due_date?: string | null }) {
    await post(`/api/tasks/${t.id}`, patch);
    setEditTaskId(null);
  }
  async function toggleSubtask(sub: Task) {
    await post(`/api/tasks/${sub.id}`, { status: sub.status === "done" ? "todo" : "done" });
  }
  async function addSubtask(parent: Task) {
    const title = (subtaskDrafts[parent.id] || "").trim();
    if (!title) return;
    const ok = await post("/api/tasks", { venture_id: parent.venture_id, title, description: "", assigned_to: parent.assigned_to, parent_task_id: parent.id });
    if (ok) setSubtaskDrafts((d) => ({ ...d, [parent.id]: "" }));
  }

  return (
    <>
      <div className="section-head"><span className="section-title">Taken</span>{openTaskCount > 0 && <span className="section-count">{openTaskCount}</span>}</div>
      <p className="section-sub">Wat moet er nog gebeuren, en van wie naar wie</p>

      <ForYouList tasks={tasks} me={me} ventureName={ventureName} />

      <div className="form-inline" style={{ marginTop: 14, marginBottom: 12 }}>
        <select value={taskFilterVenture ?? ""} onChange={(e) => setTaskFilterVenture(e.target.value || null)}>
          <option value="">— alle ventures —</option>
          {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={taskFilterAssignee} onChange={(e) => setTaskFilterAssignee(e.target.value)}>
          <option value="">— iedereen —</option>
          {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={taskFilterPriority} onChange={(e) => setTaskFilterPriority(e.target.value as TaskPriority | "")}>
          <option value="">— alle prioriteiten —</option>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}
        </select>
        <label className="check-label"><input type="checkbox" checked={taskFilterOverdue} onChange={(e) => setTaskFilterOverdue(e.target.checked)} /> Alleen overdue</label>
      </div>

      <div className="pipeline cols-4">
        {TASK_STATUSES.map((stage, idx) => (
          <div key={stage}>
            <div className="col-head"><b style={{ color: TASK_COLOR[stage] }}>{pad(idx + 1)}</b> {TASK_STATUS_LABEL[stage]}</div>
            <div className="col-body">
              {boardTasks.filter((t) => t.status === stage).map((t) => {
                const subtasks = tasks.filter((s) => s.parent_task_id === t.id);
                const subtasksDone = subtasks.filter((s) => s.status === "done").length;
                const isOverdue = !!t.due_date && t.due_date < todayStr && t.status !== "done";
                const isDueSoon = !!t.due_date && !isOverdue && t.due_date <= dueSoonCutoff;
                return (
                <div className="app-card" style={{ borderLeft: `3px solid ${TASK_COLOR[t.status]}` }} key={t.id}>
                  <div className="app-head" onClick={() => setOpenTaskId(openTaskId === t.id ? null : t.id)}>
                    <span className="app-name-row">
                      <span className="app-name">{t.title}</span>
                      {subtasks.length > 0 && <span className="subtask-count">{subtasksDone}/{subtasks.length}</span>}
                      {(t.priority === "high" || t.priority === "urgent") && <span className={"tag " + TASK_PRIORITY_TAG[t.priority]}>{TASK_PRIORITY_LABEL[t.priority]}</span>}
                      {t.due_date && <span className={"due-chip" + (isOverdue ? " due-over" : isDueSoon ? " due-soon" : "")}>{new Date(t.due_date).toLocaleDateString("nl-BE", { day: "2-digit", month: "2-digit" })}</span>}
                      {!taskFilterVenture && <span className="task-venture-badge">{ventureName(t.venture_id)}</span>}
                    </span>
                    <span className={"chev" + (openTaskId === t.id ? " open" : "")}>⌄</span>
                  </div>
                  {openTaskId === t.id && (
                    editTaskId === t.id ? (
                      <TaskForm task={t} crew={crew} onCancel={() => setEditTaskId(null)} onSave={(patch) => saveTask(t, patch)} />
                    ) : (
                      <div className="detail-inner">
                        {t.description && <div className="task-desc">{t.description}</div>}
                        <div className="detail-row"><span>Toegewezen aan</span><span>{crew.find((c) => c.id === t.assigned_to)?.name ?? t.assigned_to}</span></div>
                        <div className="detail-row"><span>Aangemaakt door</span><span>{PEOPLE_NAME[t.created_by] ?? t.created_by}</span></div>
                        {t.handed_off_by && <div className="detail-row"><span>Laatst doorgestuurd door</span><span>{crew.find((c) => c.id === t.handed_off_by)?.name ?? t.handed_off_by} · {relTime(t.handed_off_at)}</span></div>}
                        <div className="subtask-list">
                          {subtasks.map((s) => (
                            <div className={"subtask-row" + (s.status === "done" ? " done" : "")} key={s.id}>
                              <input type="checkbox" checked={s.status === "done"} onChange={() => toggleSubtask(s)} />
                              <label>{s.title}</label>
                            </div>
                          ))}
                          <div className="subtask-add">
                            <input
                              className="field" placeholder="+ subtaak toevoegen"
                              value={subtaskDrafts[t.id] || ""}
                              onChange={(e) => setSubtaskDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") addSubtask(t); }}
                            />
                            <button className="btn" onClick={() => addSubtask(t)}>+</button>
                          </div>
                        </div>
                        <div className="edit-actions" style={{ marginTop: 10 }}><button className="btn" onClick={() => setEditTaskId(t.id)}>Bewerken / doorsturen</button></div>
                      </div>
                    )
                  )}
                </div>
                );
              })}
              {boardTasks.filter((t) => t.status === stage).length === 0 && <div className="col-empty">—</div>}
            </div>
          </div>
        ))}
      </div>
      <TaskCreateForm crew={crew} ventures={ventures} defaultVentureId={taskFilterVenture} onSubmit={createTask} />
    </>
  );
}
