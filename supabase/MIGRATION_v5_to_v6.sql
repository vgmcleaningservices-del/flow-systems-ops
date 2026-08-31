-- v5 -> v6: prioriteit, deadline en subtaken op taken. Puur additief -- nieuwe
-- kolommen krijgen defaults, bestaande rijen blijven geldig. Geen RLS/publicatie-
-- wijziging nodig, tasks zit daar al in en select("*") pikt nieuwe kolommen vanzelf op.
alter table tasks add column if not exists priority text not null default 'normal'; -- low | normal | high | urgent
alter table tasks add column if not exists due_date date;
alter table tasks add column if not exists parent_task_id bigint references tasks(id) on delete cascade;
