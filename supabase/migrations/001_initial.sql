-- Run in a Supabase project. Local mode does not require this migration.
create table public.projects (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null check (octet_length(payload::text) <= 6000000),
 updated_at timestamptz not null default now()
);
create index projects_owner_updated_idx on public.projects(owner_id, updated_at desc);
alter table public.projects enable row level security;
create policy project_read on public.projects for select to authenticated using (owner_id = (select auth.uid()));
create policy project_insert on public.projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy project_update on public.projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy project_delete on public.projects for delete to authenticated using (owner_id = (select auth.uid()));
revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;

-- Client-written progress is intentionally not a trusted achievement credential.
-- Migrations 003 and 005 add shared AI quotas, usage and administrative aggregates.
-- Server-verified achievement credentials remain future work.
