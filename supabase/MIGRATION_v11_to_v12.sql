-- v11 -> v12: interne teamchat. Eén tabel voor zowel de War Room (channel =
-- 'warroom') als 1-op-1 chats (channel = de twee persoon-id's, alfabetisch
-- gesorteerd en gescheiden door '__', zodat het adres altijd hetzelfde is
-- ongeacht wie het gesprek start). Zelfde open-RLS-patroon als de rest van
-- deze app (privacy zit op UI-niveau, niet op databaseniveau -- consistent
-- met alle andere tabellen hier).
create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  channel text not null,
  sender text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table chat_messages enable row level security;
create policy "public read chat_messages" on chat_messages for select using (true);
alter publication supabase_realtime add table chat_messages;
