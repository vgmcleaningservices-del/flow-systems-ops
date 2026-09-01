-- v12 -> v13: gelezen-status per persoon per kanaal, nodig voor
-- ongelezen-badges en om te weten of een binnenkomend bericht een melding
-- moet triggeren (nooit voor je eigen berichten, altijd voor de rest zolang
-- ze het kanaal nog niet gelezen hebben).
create table if not exists chat_reads (
  person text not null,
  channel text not null,
  last_read_at timestamptz not null default now(),
  primary key (person, channel)
);

alter table chat_reads enable row level security;
create policy "public read chat_reads" on chat_reads for select using (true);
alter publication supabase_realtime add table chat_reads;
