create table public.tutor_daily_quotas (
 day date not null,
 subject text not null,
 requests integer not null default 0 check(requests>=0),
 primary key(day,subject)
);
create table public.ai_usage (
 id bigint generated always as identity primary key,
 owner_id uuid references auth.users(id) on delete cascade,
 model text not null,
 total_tokens integer check(total_tokens>=0),
 created_at timestamptz not null default now()
);
create index ai_usage_owner_time_idx on public.ai_usage(owner_id,created_at desc);
alter table public.tutor_daily_quotas enable row level security;
alter table public.ai_usage enable row level security;
revoke all on public.tutor_daily_quotas from anon, authenticated;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;
create policy usage_read_own on public.ai_usage for select to authenticated using(owner_id=(select auth.uid()));

create or replace function public.reserve_tutor_request(p_user uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare global_count integer; user_count integer; today date := (now() at time zone 'UTC')::date;
begin
 -- One transaction acquires the global lock before the user lock consistently.
 insert into tutor_daily_quotas(day,subject) values(today,'global'),(today,p_user::text) on conflict do nothing;
 select requests into global_count from tutor_daily_quotas where day=today and subject='global' for update;
 select requests into user_count from tutor_daily_quotas where day=today and subject=p_user::text for update;
 if global_count>=100 or user_count>=20 then return false; end if;
 update tutor_daily_quotas set requests=requests+1 where day=today and subject in ('global',p_user::text);
 return true;
end $$;
revoke all on function public.reserve_tutor_request(uuid) from public,anon,authenticated;
grant execute on function public.reserve_tutor_request(uuid) to service_role;
