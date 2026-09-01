-- v13 -> v14: foto/video-bijlagen in chat. Publieke Storage-bucket (uploads
-- lopen via de server met de service-role key, dus geen aparte
-- storage-schrijfpolicy nodig -- alleen lezen moet publiek zijn zodat de
-- <img>/<video>-tags de bestanden zonder signed URL kunnen tonen).
insert into storage.buckets (id, name, public) values ('chat-uploads', 'chat-uploads', true) on conflict (id) do nothing;

alter table chat_messages add column if not exists media_url text;
alter table chat_messages add column if not exists media_type text; -- 'image' | 'video'
