-- v6 -> v7: Wiki / gedeelde kennisbank -- korte notities per venture of algemeen.
-- Zelfde nullable-FK-patroon als directives/commits/crew_events/metrics/payouts:
-- venture_id null = company-wide pagina.
create table if not exists wiki_pages (
  id bigint generated always as identity primary key,
  venture_id text references ventures(id),  -- null = algemene (company-wide) pagina
  title text not null,
  content text not null default '',
  created_by text not null,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wiki_pages enable row level security;
create policy "public read wiki_pages" on wiki_pages for select using (true);
alter publication supabase_realtime add table wiki_pages;
