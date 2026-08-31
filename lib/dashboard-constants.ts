import { ALL_PEOPLE } from "@/lib/people";
import type { BillingCycle, CrewStatus, Stage, TaskPriority, TaskStatus } from "@/lib/dashboard-types";

export const STATUS_LABEL: Record<CrewStatus, string> = { waiting: "Wachtend", active: "Geïsoleerd · Actief", bottleneck: "Active Bottleneck", auto: "Geautomatiseerd" };
export const STATUS_TAG: Record<CrewStatus, string> = { waiting: "t-waiting", active: "t-active", bottleneck: "t-bottleneck", auto: "t-auto" };
export const STAGE_LABEL: Record<Stage, string> = { scouting: "Concept / Scouting", sprint: "Actieve Sprint (72u)", "exit-ready": "Exit Ready" };
export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "handed_off", "done"];
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { todo: "Te doen", in_progress: "Bezig", handed_off: "Doorgegeven", done: "Klaar" };
export const TASK_STATUS_TAG: Record<TaskStatus, string> = { todo: "t-todo", in_progress: "t-in_progress", handed_off: "t-handed_off", done: "t-done" };
// Elke kolom een eigen betekenisvolle kleur (zelfde semantiek als de rest van dit
// dashboard: idle = nog niet begonnen, accent = actief werk, warn = wacht op
// oppak-actie, good = klaar) -- niet zomaar 4 willekeurige tinten.
export const TASK_COLOR: Record<TaskStatus, string> = { todo: "var(--idle)", in_progress: "var(--accent)", handed_off: "var(--warn)", done: "var(--good)" };
export const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high", "urgent"];
export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = { low: "Laag", normal: "Normaal", high: "Hoog", urgent: "Urgent" };
export const TASK_PRIORITY_TAG: Record<TaskPriority, string> = { low: "t-p-low", normal: "t-p-normal", high: "t-p-high", urgent: "t-p-urgent" };
export const PEOPLE_NAME: Record<string, string> = Object.fromEntries(ALL_PEOPLE.map((p) => [p.id, p.name]));
export const TOOL_CATEGORIES = ["hosting", "database", "payments", "ai", "communicatie", "domein", "overig"] as const;
export const TOOL_CATEGORY_LABEL: Record<string, string> = {
  hosting: "Hosting", database: "Database", payments: "Payments", ai: "AI",
  communicatie: "Communicatie", domein: "Domein", overig: "Overig",
};
export const BILLING_LABEL: Record<BillingCycle, string> = { maandelijks: "/ maand", jaarlijks: "/ jaar", eenmalig: "eenmalig" };
export const METRIC_LABELS: Record<string, string> = {
  outreach_contacted: "Outreach — contacted",
  outreach_replies: "Outreach — replies",
  outreach_meetings: "Outreach — meetings",
  ideas_pitched: "Ideeën gepitcht",
  other: "Overig",
};
