-- Run this once. Adds een per-venture taken-/tickerbord met een expliciete
-- doorstuur-actie ("hand-off"): Laurens rondt een backend-taak af, stuurt 'm
-- door naar Seba, en die verschijnt bij Seba op zijn eigen "voor jou"-lijst.
-- Puur additief -- geen bestaande kolom of tabel wordt aangepast.

create table if not exists tasks (
  id bigint generated always as identity primary key,
  venture_id text not null references ventures(id),
  title text not null,
  description text not null default '',
  status text not null default 'todo',        -- todo | in_progress | handed_off | done
  created_by text not null,                   -- vrije tekst zoals directives.author -- ook Matthias mag
                                               -- een taak loggen, en die is (bewust) geen crew-rij
  assigned_to text not null references crew(id), -- van wie de "voor jou"-lijst dit is
  handed_off_by text references crew(id),     -- wie de laatste keer heeft doorgestuurd
  handed_off_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks enable row level security;
create policy "public read tasks" on tasks for select using (true);
alter publication supabase_realtime add table tasks;
