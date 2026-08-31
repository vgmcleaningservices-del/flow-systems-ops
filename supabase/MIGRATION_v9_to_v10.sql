-- v9 -> v10: historische MRR-snapshots, nodig voor een echte omzetgrafiek.
-- Tot nu toe hielden we alleen `mrr` (nu) en `mrr_prev` (vorige waarde) bij op
-- ventures zelf -- genoeg voor een percentage-pijltje, niet voor een grafiek
-- over tijd. Vanaf nu schrijft de dagelijkse /api/mrr-sync cron én elke
-- handmatige MRR-wijziging een rij weg, dus de grafiek bouwt zichzelf op.
create table if not exists mrr_snapshots (
  id bigint generated always as identity primary key,
  venture_id text not null references ventures(id),
  mrr int not null,
  captured_at timestamptz not null default now()
);

alter table mrr_snapshots enable row level security;
create policy "public read mrr_snapshots" on mrr_snapshots for select using (true);
alter publication supabase_realtime add table mrr_snapshots;

-- Backfill: mrr_prev is de enige historische waarde die we al hadden -- zet 'm
-- op "gisteren" zodat de grafiek meteen met 2 punten start i.p.v. helemaal leeg.
insert into mrr_snapshots (venture_id, mrr, captured_at)
select id, mrr_prev, coalesce(mrr_synced_at, now()) - interval '1 day' from ventures;
insert into mrr_snapshots (venture_id, mrr, captured_at)
select id, mrr, now() from ventures;
