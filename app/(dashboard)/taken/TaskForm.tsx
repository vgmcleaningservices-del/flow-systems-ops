"use client";
import { useState } from "react";
import type { Crew, Task, TaskPriority, TaskStatus } from "@/lib/dashboard-types";
import { TASK_STATUSES, TASK_STATUS_LABEL, TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@/lib/dashboard-constants";

export function TaskForm({ task, crew, onCancel, onSave }: {
  task: Task; crew: Crew[]; onCancel: () => void;
  onSave: (patch: { title?: string; description?: string; status?: TaskStatus; assigned_to?: string; priority?: TaskPriority; due_date?: string | null }) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  return (
    <div className="edit-form">
      <div><label>Titel</label><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label>Omschrijving</label><input className="field" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div><label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div><label>Prioriteit</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}
        </select>
      </div>
      <div><label>Deadline (optioneel)</label><input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
      <div><label>Toegewezen aan — kiezen = doorsturen</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="edit-actions">
        <button className="btn primary" onClick={() => onSave({ title, description, status, assigned_to: assignedTo, priority, due_date: dueDate || null })}>Opslaan</button>
        <button className="btn ghost" onClick={onCancel}>Annuleren</button>
      </div>
    </div>
  );
}
