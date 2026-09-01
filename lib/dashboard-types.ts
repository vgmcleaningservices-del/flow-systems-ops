export type CrewStatus = "waiting" | "active" | "bottleneck" | "auto";
export type Stage = "scouting" | "sprint" | "exit-ready";
export type TaskStatus = "todo" | "in_progress" | "handed_off" | "done";

export interface Crew {
  id: string; name: string; rank: string; role: string;
  github_username: string | null; status: CrewStatus; task: string; note: string;
  current_venture_id: string | null;
}
export interface Venture {
  id: string; name: string; stage: Stage; price: string; feature: string;
  repo_done: boolean; domein_done: boolean; stripe_done: boolean;
  github_repo: string | null; pitched_by: string | null; royalty_pct: number;
  mrr: number; mrr_prev: number; sprint_deadline: string | null; sprint_label: string;
  mrr_source_url: string | null; mrr_synced_at: string | null; notion_url: string | null;
  long_description: string;
}
export interface CommitRow { id: number; repo: string; venture_id: string | null; crew_id: string | null; sha: string; message: string; author: string; pass_to: string | null; ts: string; }
export interface Directive { id: number; venture_id: string | null; author: string; type: "directive" | "veto"; text: string; ts: string; }
export interface CrewEvent { id: number; crew_id: string; venture_id: string | null; from_status: string | null; to_status: string; source: string; ts: string; }
export interface Metric { id: number; crew_id: string; venture_id: string | null; label: string; value: number; period: string; note: string | null; created_at: string; }
export interface Payout { id: number; crew_id: string; venture_id: string | null; amount: number; note: string | null; paid_at: string; recorded_by: string; }
export interface CommitSummary { id: number; venture_id: string | null; summary: string; commit_count: number; created_at: string; }
export interface MrrSnapshot { id: number; venture_id: string; mrr: number; captured_at: string; }
export interface ChatMessage { id: number; channel: string; sender: string; content: string; media_url: string | null; media_type: string | null; created_at: string; }
export interface ChatRead { person: string; channel: string; last_read_at: string; }
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export interface Task {
  id: number; venture_id: string; title: string; description: string; status: TaskStatus;
  priority: TaskPriority; due_date: string | null; parent_task_id: number | null;
  created_by: string; assigned_to: string; handed_off_by: string | null; handed_off_at: string | null;
  created_at: string; updated_at: string;
}
export type BillingCycle = "maandelijks" | "jaarlijks" | "eenmalig";
export type ToolStatus = "active" | "cancelled";
export interface Tool {
  id: number; name: string; category: string; url: string | null; cost: number;
  billing_cycle: BillingCycle; renews_on: string | null; account_owner: string | null;
  notes: string; status: ToolStatus; created_at: string; updated_at: string;
}
export interface WikiPage {
  id: number; venture_id: string | null; title: string; content: string;
  created_by: string; updated_by: string | null; created_at: string; updated_at: string;
}
