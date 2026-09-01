-- v10 -> v11: uitgebreide, leesbare uitleg per venture voor de nieuwe
-- Programma's-pagina. ventures.feature is bewust kort (1 regel voor op de
-- pipeline-kaart); long_description is de plek voor het volledige
-- probleem/oplossing/mechanisme-verhaal.
alter table ventures add column if not exists long_description text not null default '';
