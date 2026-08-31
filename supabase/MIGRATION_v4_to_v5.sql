-- v4 -> v5: Tools & Abonnementen -- overzicht van alle programma's/diensten die
-- Flow Systems gebruikt (Vercel, Supabase, Stripe, Notion, ...), met kosten en
-- vervaldatum, zodat Matthias dit in één oogopslag ziet i.p.v. het te moeten
-- onthouden of losse notities na te zoeken.
create table if not exists tools (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null default 'overig', -- hosting | database | payments | ai | communicatie | domein | overig
  url text,
  cost numeric not null default 0,
  billing_cycle text not null default 'maandelijks', -- maandelijks | jaarlijks | eenmalig
  renews_on date,
  account_owner text,
  notes text not null default '',
  status text not null default 'active', -- active | cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tools enable row level security;
create policy "public read tools" on tools for select using (true);
alter publication supabase_realtime add table tools;
