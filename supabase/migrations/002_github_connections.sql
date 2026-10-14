create table public.github_connections (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 login text not null,
 encrypted_token text not null,
 updated_at timestamptz not null default now()
);
alter table public.github_connections enable row level security;
-- Credentials are accessible only through the backend service role.
revoke all on public.github_connections from anon, authenticated;
