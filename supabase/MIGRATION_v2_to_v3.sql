-- Run this once. Adds live-MRR sync: a venture can report its own real Stripe
-- MRR to a small authenticated endpoint on its own app, and the ops dashboard
-- pulls it in on a schedule instead of relying on a manually-typed number.
-- Each venture's Stripe key never leaves its own app — only a read-only euro
-- amount crosses the boundary.

alter table ventures add column if not exists mrr_source_url text;
alter table ventures add column if not exists mrr_synced_at timestamptz;

update ventures set mrr_source_url = 'https://www.tendertox.com/api/mrr' where id = 'tendertox';

-- Optional per-venture link to its Notion doc/notes page — nothing fetched or
-- embedded, just a link shown when set. The workspace has no pages in it yet,
-- so this is empty plumbing to fill in later, not fake content.
alter table ventures add column if not exists notion_url text;
