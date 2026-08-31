-- v7 -> v8: royalty-percentage per venture wordt instelbaar (was hardcoded 5%
-- voor wie "zende" als pitched_by had). Backfill behoudt het huidige gedrag
-- exact: bestaande Zende-ventures krijgen royalty_pct = 5, de rest 0 -- precies
-- wat de oude "pitched_by === 'zende' ? mrr * 0.05 : 0"-regel al deed.
alter table ventures add column if not exists royalty_pct numeric not null default 0;
update ventures set royalty_pct = 5 where pitched_by = 'zende' and royalty_pct = 0;
