-- Flow Systems Command Center — schema v2
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Already ran v1? Use MIGRATION_v1_to_v2.sql instead of this file.

create table if not exists crew (
  id text primary key,
  name text not null,
  rank text not null,
  role text not null,
  github_username text,               -- GitHub login, lowercase, no @. Used to attribute commits.
  status text not null default 'waiting', -- waiting | active | bottleneck | auto
  task text not null default '',
  note text not null default '',
  current_venture_id text,            -- which venture this person is currently working on (nullable)
  updated_at timestamptz not null default now()
);

-- One row per dochterbedrijf/app. This is the multi-venture core: MRR, sprint clock
-- and isolation checklist all live here now, per venture, instead of one global row.
create table if not exists ventures (
  id text primary key,
  name text not null,
  stage text not null default 'scouting', -- scouting | sprint | exit-ready
  price text not null default '',
  feature text not null default '',
  repo_done boolean not null default false,
  domein_done boolean not null default false,
  stripe_done boolean not null default false,
  github_repo text,                   -- GitHub repo name (e.g. "suppliersync") for webhook matching
  pitched_by text references crew(id), -- who scouted this idea -- drives Zende's royalty
  mrr int not null default 0,
  mrr_prev int not null default 0,
  mrr_source_url text,                -- if set, /api/mrr-sync pulls real MRR from this venture's own /api/mrr
  mrr_synced_at timestamptz,          -- when mrr was last refreshed from mrr_source_url
  notion_url text,                    -- optional link to this venture's Notion doc/notes page
  sprint_deadline timestamptz,
  sprint_label text not null default '',
  updated_at timestamptz not null default now()
);

alter table crew add constraint crew_current_venture_fk foreign key (current_venture_id) references ventures(id) on delete set null;

create table if not exists commits (
  id bigint generated always as identity primary key,
  repo text not null,
  venture_id text references ventures(id),
  crew_id text references crew(id),    -- resolved server-side from github_username, not string-matched in the UI
  sha text not null,
  message text not null,
  author text,                         -- raw GitHub author name/username from the payload (display only)
  pass_to text,                        -- parsed from [PASS:NAME] in the commit message, or null
  ts timestamptz not null default now()
);

create table if not exists directives (
  id bigint generated always as identity primary key,
  venture_id text references ventures(id), -- null = company-wide directive
  author text not null,
  type text not null default 'directive', -- directive | veto
  text text not null,
  ts timestamptz not null default now()
);

-- Audit trail of every status change, manual or webhook-driven. Not shown directly
-- in the MVP UI, but it's what future "time to handoff" performance metrics read from.
create table if not exists crew_events (
  id bigint generated always as identity primary key,
  crew_id text references crew(id),
  venture_id text references ventures(id),
  from_status text,
  to_status text not null,
  source text not null default 'manual', -- manual | webhook
  ts timestamptz not null default now()
);

-- Manually-logged performance numbers for work that doesn't show up as commits
-- (Runar's outreach, Zende's scouting hit-rate, ...).
create table if not exists metrics (
  id bigint generated always as identity primary key,
  crew_id text not null references crew(id),
  venture_id text references ventures(id),
  label text not null,        -- e.g. 'outreach_contacted', 'outreach_replies', 'outreach_meetings', 'ideas_pitched'
  value numeric not null,
  period text not null,       -- ISO week, e.g. '2026-W35'
  note text,
  created_at timestamptz not null default now()
);

-- Read-only-by-design payout LOG (not a payment execution): Matthias records here
-- when he has actually paid someone, so "owed" (computed) and "paid" (this table)
-- can be compared. Nothing in this app ever moves money.
create table if not exists payouts (
  id bigint generated always as identity primary key,
  crew_id text not null references crew(id),
  venture_id text references ventures(id),
  amount numeric not null,
  note text,
  paid_at timestamptz not null default now(),
  recorded_by text not null
);

-- Per-venture taken-/tickerbord met een expliciete doorstuur-actie ("hand-off").
create table if not exists tasks (
  id bigint generated always as identity primary key,
  venture_id text not null references ventures(id),
  title text not null,
  description text not null default '',
  status text not null default 'todo',        -- todo | in_progress | handed_off | done
  created_by text not null,                   -- vrije tekst zoals directives.author -- ook Matthias mag
                                               -- een taak loggen, en die is (bewust) geen crew-rij
  assigned_to text not null references crew(id), -- van wie de "voor jou"-lijst dit is
  handed_off_by text references crew(id),     -- wie de laatste keer heeft doorgestuurd
  handed_off_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Overzicht van alle programma's/diensten die Flow Systems gebruikt (Vercel,
-- Supabase, Stripe, Notion, ...), met kosten en vervaldatum -- puur ter referentie,
-- geen koppeling met andere tabellen nodig.
create table if not exists tools (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null default 'overig', -- hosting | database | payments | ai | communicatie | domein | overig
  url text,
  cost numeric not null default 0,
  billing_cycle text not null default 'maandelijks', -- maandelijks | jaarlijks | eenmalig
  renews_on date,
  account_owner text,
  notes text not null default '',
  status text not null default 'active', -- active | cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- seed data — edit freely afterwards from the dashboard or the Supabase table editor.
-- Order matters: crew and ventures reference each other (pitched_by / current_venture_id),
-- so insert both without their cross-reference first, then backfill with UPDATEs —
-- otherwise the very first insert trips the other table's foreign key.
insert into crew (id, name, rank, role, github_username, status, task, note) values
  ('laurens', 'Laurens', 'R2', 'Backend / API / Tech Logic', null, 'waiting', 'Nog geen commits binnengekomen', ''),
  ('seba',    'Seba',    'R3', 'Ops / QA', null, 'waiting', 'Nog geen commits binnengekomen', ''),
  ('runar',   'Runar',   'R2', 'Growth / Apollo Cold Outreach', null, 'waiting', 'Nog geen commits binnengekomen', ''),
  ('zende',   'Zende',   'R4', 'R&D Scout — parallelle track', null, 'active', 'Doorlopend: volgend B2B pijnpunt scouten', '')
on conflict (id) do nothing;

insert into ventures (id, name, stage, price, feature, repo_done, domein_done, stripe_done, github_repo, pitched_by, mrr, mrr_prev, sprint_deadline, sprint_label) values
  ('cartrescue',   'CartRescue AI', 'scouting',   '€149 / mnd', '', false, false, false, null, 'zende', 0, 0, null, ''),
  ('disputenuke',  'DisputeNuke',   'scouting',   'Nog niet bepaald', '', false, false, false, null, 'zende', 0, 0, null, ''),
  ('suppliersync', 'SupplierSync',  'sprint',     '€49 / mnd', 'Meta Ads Auto-Kill Switch', true, false, false, 'suppliersync', 'zende', 1689, 1560, null, 'SupplierSync'),
  ('tendertox',    'Tendertox',     'exit-ready', '€199 / mnd', 'RFP Matrix AI', true, true, true, 'tendertox', null, 0, 0, null, '')
on conflict (id) do nothing;

update crew set current_venture_id = 'suppliersync' where id in ('laurens', 'seba', 'runar');

-- Row Level Security: anon key may only READ. All writes go through the server
-- (API routes using the service role key), which sits behind the team login cookie.
alter table crew enable row level security;
alter table ventures enable row level security;
alter table commits enable row level security;
alter table directives enable row level security;
alter table crew_events enable row level security;
alter table metrics enable row level security;
alter table payouts enable row level security;
alter table tasks enable row level security;
alter table tools enable row level security;

create policy "public read crew" on crew for select using (true);
create policy "public read ventures" on ventures for select using (true);
create policy "public read commits" on commits for select using (true);
create policy "public read directives" on directives for select using (true);
create policy "public read crew_events" on crew_events for select using (true);
create policy "public read metrics" on metrics for select using (true);
create policy "public read payouts" on payouts for select using (true);
create policy "public read tasks" on tasks for select using (true);
create policy "public read tools" on tools for select using (true);

-- Realtime: let the dashboard subscribe to live changes instead of polling.
alter publication supabase_realtime add table crew;
alter publication supabase_realtime add table ventures;
alter publication supabase_realtime add table commits;
alter publication supabase_realtime add table directives;
alter publication supabase_realtime add table metrics;
alter publication supabase_realtime add table payouts;
alter publication supabase_realtime add table tools;
alter publication supabase_realtime add table tasks;
