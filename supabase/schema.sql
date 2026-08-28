-- Flow Systems Command Center — schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create table if not exists crew (
  id text primary key,
  name text not null,
  rank text not null,
  role text not null,
  github_username text,               -- GitHub login, lowercase, no @. Used to attribute commits.
  status text not null default 'waiting', -- waiting | active | bottleneck | auto
  task text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists pipeline (
  id text primary key,
  name text not null,
  stage text not null default 'scouting', -- scouting | sprint | exit-ready
  price text not null default '',
  feature text not null default '',
  repo_done boolean not null default false,
  domein_done boolean not null default false,
  stripe_done boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists commits (
  id bigint generated always as identity primary key,
  repo text not null,
  sha text not null,
  message text not null,
  author text,                         -- raw GitHub author name/username from the payload
  pass_to text,                        -- parsed from [PASS:NAME] in the commit message, or null
  ts timestamptz not null default now()
);

create table if not exists directives (
  id bigint generated always as identity primary key,
  author text not null,
  type text not null default 'directive', -- directive | veto
  text text not null,
  ts timestamptz not null default now()
);

create table if not exists telemetry (
  id int primary key default 1,
  mrr int not null default 0,
  mrr_prev int not null default 0,
  sprint_deadline timestamptz,
  sprint_label text not null default '',
  updated_at timestamptz not null default now(),
  constraint telemetry_singleton check (id = 1)
);

-- seed data — edit freely afterwards from the dashboard or the Supabase table editor
insert into crew (id, name, rank, role, github_username, status, task, note) values
  ('laurens', 'Laurens', 'R2', 'Backend / API / Tech Logic', null, 'waiting', 'Nog geen commits binnengekomen', ''),
  ('seba',    'Seba',    'R3', 'Ops / QA', null, 'waiting', 'Nog geen commits binnengekomen', ''),
  ('runar',   'Runar',   'R2', 'Growth / Apollo Cold Outreach', null, 'waiting', 'Nog geen commits binnengekomen', ''),
  ('zende',   'Zende',   'R4', 'R&D Scout — parallelle track', null, 'active', 'Doorlopend: volgend B2B pijnpunt scouten', '')
on conflict (id) do nothing;

insert into pipeline (id, name, stage, price, feature, repo_done, domein_done, stripe_done) values
  ('cartrescue',   'CartRescue AI', 'scouting',   '€149 / mnd', '', false, false, false),
  ('disputenuke',  'DisputeNuke',   'scouting',   'Nog niet bepaald', '', false, false, false),
  ('suppliersync', 'SupplierSync',  'sprint',     '€49 / mnd', 'Meta Ads Auto-Kill Switch', true, false, false),
  ('tendertox',    'Tendertox',     'exit-ready', '€199 / mnd', 'RFP Matrix AI', true, true, true)
on conflict (id) do nothing;

insert into telemetry (id, mrr, mrr_prev, sprint_deadline, sprint_label) values
  (1, 1689, 1560, null, 'SupplierSync')
on conflict (id) do nothing;

-- Row Level Security: anon key may only READ. All writes go through the server
-- (API routes using the service role key), which sits behind the team login cookie.
alter table crew enable row level security;
alter table pipeline enable row level security;
alter table commits enable row level security;
alter table directives enable row level security;
alter table telemetry enable row level security;

create policy "public read crew" on crew for select using (true);
create policy "public read pipeline" on pipeline for select using (true);
create policy "public read commits" on commits for select using (true);
create policy "public read directives" on directives for select using (true);
create policy "public read telemetry" on telemetry for select using (true);

-- Realtime: let the dashboard subscribe to live changes instead of polling.
alter publication supabase_realtime add table crew;
alter publication supabase_realtime add table pipeline;
alter publication supabase_realtime add table commits;
alter publication supabase_realtime add table directives;
alter publication supabase_realtime add table telemetry;
