-- v16 -> v17: like-knop op War Room-posts in de nieuwe Instagram-stijl Feed.
create table if not exists chat_message_likes (
  message_id bigint not null references chat_messages(id) on delete cascade,
  person text not null,
  liked_at timestamptz not null default now(),
  primary key (message_id, person)
);

alter table chat_message_likes enable row level security;
create policy "public read chat_message_likes" on chat_message_likes for select using (true);
alter publication supabase_realtime add table chat_message_likes;
