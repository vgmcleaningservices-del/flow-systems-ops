import type { Task } from "@/lib/dashboard-types";
import { TASK_STATUS_LABEL, TASK_STATUS_TAG } from "@/lib/dashboard-constants";

// Gedeeld tussen /taken (volledige takenlijst) en de Overview-teaser voor
// teamleden (al servergefilterd op assigned_to=me) -- in beide gevallen
// filtert dit component zelf nog eens op me + open status, dus de tweede
// aanroep is puur een optimalisatie, geen ander gedrag.
export function ForYouList({ tasks, me, ventureName }: {
  tasks: Task[]; me: string; ventureName: (id: string | null) => string | null;
}) {
  const myOpenTasks = tasks.filter((t) => t.assigned_to === me && t.status !== "done");

  if (myOpenTasks.length === 0) {
    return <div className="for-you empty">Niks voor jou openstaand — mooi zo.</div>;
  }
  return (
    <div className="for-you">
      <div className="for-you-head">Voor jou <span className="for-you-count">{myOpenTasks.length}</span></div>
      {myOpenTasks.map((t) => (
        <div className="for-you-line" key={t.id}>
          <span><span className="venture">{ventureName(t.venture_id)}</span>{t.title}</span>
          <span className={"tag " + TASK_STATUS_TAG[t.status]}>{TASK_STATUS_LABEL[t.status]}</span>
        </div>
      ))}
    </div>
  );
}
