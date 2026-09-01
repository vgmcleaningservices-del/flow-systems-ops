-- v14 -> v15: "Snapchat-concept" voor foto/video-berichten -- eenmaal bekeken
-- door een ontvanger, verdwijnt de inhoud voor DIE ontvanger (niet voor de
-- verzender, en in War Room niet voor de andere leden -- vandaar per-viewer
-- tracking i.p.v. één kolom op chat_messages zelf). Geldt bewust niet voor
-- voice-berichten (audio), die blijven altijd herbeluisterbaar.
create table if not exists chat_message_views (
  message_id bigint not null references chat_messages(id) on delete cascade,
  viewer text not null,
  viewed_at timestamptz not null default now(),
  primary key (message_id, viewer)
);

alter table chat_message_views enable row level security;
create policy "public read chat_message_views" on chat_message_views for select using (true);
alter publication supabase_realtime add table chat_message_views;
