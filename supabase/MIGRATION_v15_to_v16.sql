-- v15 -> v16: het eenmalig-bekijken ("Snapchat") concept voor foto/video-
-- berichten wordt losgelaten -- media is nu gewoon altijd zichtbaar, zoals
-- tekst. Losstaand komt er een persoonlijk foto/video-archief per teamlid
-- ("Herinneringen"), maar dat leest gewoon uit de al bestaande chat_messages
-- tabel en heeft geen eigen opslag nodig. chat_message_views is dus dood.
drop table if exists chat_message_views;
