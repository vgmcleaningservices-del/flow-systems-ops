-- Run this INSTEAD of schema.sql if you already ran the original schema.sql
-- (the one with a "pipeline" table and a singleton "telemetry" row).
-- Safe to run once. Turns "pipeline" into the new multi-venture "ventures" table
-- and retires the singleton telemetry row in favour of per-venture MRR/sprint fields.

alter table pipeline rename to ventures;
alter table ventures add column if not exists github_repo text;
alter table ventures add column if not exists pitched_by text references crew(id);
alter table ventures add column if not exists mrr int not null default 0;
alter table ventures add column if not exists mrr_prev int not null default 0;
alter table ventures add column if not exists sprint_deadline timestamptz;
alter table ventures add column if not exists sprint_label text not null default '';

-- carry the old singleton telemetry row over onto the active sprint venture, if any
do $$
declare t record;
begin
  select * into t from telemetry where id = 1;
  if found then
    update ventures set mrr = t.mrr, mrr_prev = t.mrr_prev, sprint_deadline = t.sprint_deadline, sprint_label = t.sprint_label
    where stage = 'sprint';
  end if;
end $$;

drop table if exists telemetry;

alter table crew add column if not exists current_venture_id text references ventures(id) on delete set null;
update crew set current_venture_id = 'suppliersync' where current_venture_id is null and status in ('waiting', 'bottleneck');

alter table commits add column if not exists venture_id text references ventures(id);
alter table commits add column if not exists crew_id text references crew(id);
update commits set venture_id = 'suppliersync' where venture_id is null;

alter table directives add column if not exists venture_id text references ventures(id);

create table if not exists crew_events (
  id bigint generated always as identity primary key,
  crew_id text references crew(id),
  venture_id text references ventures(id),
  from_status text,
  to_status text not null,
  source text not null default 'manual',
  ts timestamptz not null default now()
);

create table if not exists metrics (
  id bigint generated always as identity primary key,
  crew_id text not null references crew(id),
  venture_id text references ventures(id),
  label text not null,
  value numeric not null,
  period text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists payouts (
  id bigint generated always as identity primary key,
  crew_id text not null references crew(id),
  venture_id text references ventures(id),
  amount numeric not null,
  note text,
  paid_at timestamptz not null default now(),
  recorded_by text not null
);

alter table crew_events enable row level security;
alter table metrics enable row level security;
alter table payouts enable row level security;
create policy "public read crew_events" on crew_events for select using (true);
create policy "public read metrics" on metrics for select using (true);
create policy "public read payouts" on payouts for select using (true);

alter publication supabase_realtime add table ventures;
alter publication supabase_realtime add table metrics;
alter publication supabase_realtime add table payouts;

update ventures set pitched_by = 'zende' where id in ('cartrescue', 'disputenuke', 'suppliersync');
