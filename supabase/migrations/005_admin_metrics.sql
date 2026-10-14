-- Service-role-only aggregates. Never expose this RPC to browser roles.
create or replace function public.admin_snapshot()
returns jsonb language sql security definer set search_path = public, pg_catalog
as $$
select jsonb_build_object(
 'totalUsers', (select count(*) from auth.users),
 'usersSignedInLastSevenDays', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
 'storedProjects', (select count(*) from public.projects),
 'databaseConnections', (select count(*) from pg_stat_activity where datname = current_database()),
 'aiRequestsToday', (select count(*) from public.ai_usage where created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),
 'recordedTokensToday', (select coalesce(sum(total_tokens),0) from public.ai_usage where created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),
 'usageRecordsWithoutTokenCount', (select count(*) from public.ai_usage where total_tokens is null),
 'measuredAt', now()
);
$$;
revoke all on function public.admin_snapshot() from public, anon, authenticated;
grant execute on function public.admin_snapshot() to service_role;
