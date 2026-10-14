create table if not exists public.preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (octet_length(payload::text) <= 160000),
  updated_at timestamptz not null default now()
);
alter table public.preferences enable row level security;
revoke all on public.preferences from anon;
grant select, insert, update, delete on public.preferences to authenticated;
create policy "Read own preferences" on public.preferences for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Insert own preferences" on public.preferences for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own preferences" on public.preferences for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own preferences" on public.preferences for delete to authenticated using ((select auth.uid()) = owner_id);
