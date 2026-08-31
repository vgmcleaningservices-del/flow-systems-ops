-- v8 -> v9: plain-language (jip-en-janneke) samenvatting van git-activiteit.
-- Eén rij per push-webhook-event (dus meestal één venture per rij, null = kon
-- niet aan een venture gekoppeld worden). Gevuld door de Claude API, best-effort:
-- als die call faalt (geen API key, rate limit) slaat de webhook gewoon deze
-- rij over -- de ruwe commits blijven altijd wel gelogd.
create table if not exists commit_summaries (
  id bigint generated always as identity primary key,
  venture_id text references ventures(id),
  summary text not null,
  commit_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table commit_summaries enable row level security;
create policy "public read commit_summaries" on commit_summaries for select using (true);
alter publication supabase_realtime add table commit_summaries;
