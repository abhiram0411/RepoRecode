-- Apply once, AFTER 006. Server-only, bounded storage for the hosted gateway.
-- No browser table/RPC access. All writes serialize on one small control row.
create table public.community_control (
  id boolean primary key default true check (id),
  collection_paused_until timestamptz
);
insert into public.community_control(id) values(true);
create table public.community_feedback (
  id uuid primary key,
  at timestamptz not null default now(),
  payload jsonb not null check (octet_length(payload::text) <= 16000)
);
create table public.community_activity (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  first_seen date,
  last_seen date,
  revoked_until timestamptz,
  check ((revoked_until is null and first_seen is not null and last_seen >= first_seen)
    or (revoked_until is not null and first_seen is null and last_seen is null))
);
create table public.gateway_limits (
  scope text primary key check (scope in ('feedback','activity','account','admin','github')),
  hour_start timestamptz not null,
  hour_count integer not null check (hour_count >= 0),
  day_start date not null,
  day_count integer not null check (day_count >= 0)
);
alter table public.community_control enable row level security;
alter table public.community_feedback enable row level security;
alter table public.community_activity enable row level security;
alter table public.gateway_limits enable row level security;
revoke all on public.community_control, public.community_feedback,
  public.community_activity, public.gateway_limits from public, anon, authenticated, service_role;

create function public.gateway_backend_status()
returns integer language sql security definer set search_path = '' as $$
  select 7 from public.community_control where id = true;
$$;

-- Global per-service admission, shared across replicas. Fixed five-row ceiling.
-- This bounds accepted work, not provider invocations; Free/Hobby quotas still apply.
create function public.gateway_admit_request(p_scope text)
returns boolean language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare h integer; d integer; row public.gateway_limits;
  today date := (now() at time zone 'UTC')::date;
  hour_stamp timestamptz := date_trunc('hour', now());
begin
  case p_scope
    when 'feedback' then h := 100; d := 1000;
    when 'activity' then h := 500; d := 5000;
    when 'account' then h := 20; d := 100;
    when 'admin' then h := 60; d := 300;
    when 'github' then h := 120; d := 600;
    else raise exception 'Unsupported request scope';
  end case;
  perform 1 from public.community_control where id = true for update;
  if not found then raise exception 'Backend control missing'; end if;
  insert into public.gateway_limits values(p_scope,hour_stamp,0,today,0)
    on conflict(scope) do nothing;
  update public.gateway_limits set
    hour_count = case when hour_start = hour_stamp then hour_count else 0 end,
    hour_start = hour_stamp,
    day_count = case when day_start = today then day_count else 0 end,
    day_start = today where scope = p_scope;
  select * into row from public.gateway_limits where scope = p_scope;
  if row.hour_count >= h or row.day_count >= d then return false; end if;
  update public.gateway_limits set hour_count = hour_count + 1, day_count = day_count + 1
    where scope = p_scope;
  return true;
end $$;

create function public.community_write(p_kind text, p_key text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare existing jsonb; paused timestamptz;
  today date := (now() at time zone 'UTC')::date;
begin
  if p_kind is null or p_kind not in ('feedback','activity','revoke') or p_key is null
    or p_value is null or jsonb_typeof(p_value) <> 'object' or octet_length(p_value::text) > 16000
    then raise exception 'Invalid submission'; end if;
  select collection_paused_until into paused from public.community_control where id = true for update;
  if not found then raise exception 'Backend control missing'; end if;
  delete from public.community_feedback where at < now() - interval '90 days';
  delete from public.community_activity where revoked_until <= now()
    or (revoked_until is null and last_seen < today - 30);
  if p_kind = 'feedback' then
    if p_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or p_value - array['category','message','rating','contact'] <> '{}'::jsonb
      or not (p_value ?& array['category','message'])
      or jsonb_typeof(p_value->'category') <> 'string'
      or p_value->>'category' not in ('feature','bug','general')
      or jsonb_typeof(p_value->'message') <> 'string'
      or length(trim(p_value->>'message')) not between 10 and 3000
      or (p_value ? 'rating' and (jsonb_typeof(p_value->'rating') <> 'number' or p_value->>'rating' !~ '^[1-5]$'))
      or (p_value ? 'contact' and (jsonb_typeof(p_value->'contact') <> 'string' or length(p_value->>'contact') > 254
        or p_value->>'contact' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
      then raise exception 'Invalid feedback'; end if;
    select payload into existing from public.community_feedback where id = p_key::uuid;
    if found then
      if existing <> p_value then return jsonb_build_object('status',409,'error','Submission identifier already used.'); end if;
      return jsonb_build_object('status',201,'id',p_key,'received',true);
    end if;
    if (select count(*) from public.community_feedback) >= 1000 then
      return jsonb_build_object('status',503,'error','Feedback storage is full. Please try later.'); end if;
    if not public.gateway_admit_request('feedback') then
      return jsonb_build_object('status',429,'error','Submission limit reached. Please try later.'); end if;
    insert into public.community_feedback(id,payload) values(p_key::uuid,p_value);
    return jsonb_build_object('status',201,'id',p_key,'received',true);
  end if;
  if p_key !~ '^[a-f0-9]{64}$' or p_value <> '{}'::jsonb then raise exception 'Invalid activity'; end if;
  if p_kind = 'revoke' then
    -- Clear recorded days and retain only a rejection marker for delayed POSTs.
    if exists(select 1 from public.community_activity where id = p_key)
      or (select count(*) from public.community_activity) < 10000 then
      insert into public.community_activity(id,revoked_until) values(p_key,now()+interval '30 days')
      on conflict(id) do update set first_seen = null, last_seen = null, revoked_until = excluded.revoked_until;
    else
      -- Marker capacity exhausted: deletion still succeeds, all collection pauses.
      update public.community_control set collection_paused_until = now()+interval '30 days' where id = true;
    end if;
    return jsonb_build_object('status',200,'deleted',true);
  end if;
  if paused > now() or exists(select 1 from public.community_activity where id = p_key and revoked_until > now()) then
    return jsonb_build_object('status',409,'error','Activity consent was revoked or collection is temporarily paused. No activity was stored.'); end if;
  if exists(select 1 from public.community_activity where id = p_key and last_seen = today) then
    return jsonb_build_object('status',202,'recorded',true); end if;
  if not exists(select 1 from public.community_activity where id = p_key)
    and (select count(*) from public.community_activity) >= 10000 then
    return jsonb_build_object('status',503,'error','Activity storage is full. Please try later.'); end if;
  if not public.gateway_admit_request('activity') then
    return jsonb_build_object('status',429,'error','Activity limit reached. Please try later.'); end if;
  insert into public.community_activity(id,first_seen,last_seen) values(p_key,today,today)
    on conflict(id) do update set last_seen = excluded.last_seen;
  return jsonb_build_object('status',202,'recorded',true);
end $$;

create function public.community_snapshot()
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare today date := (now() at time zone 'UTC')::date; result jsonb;
begin
  perform 1 from public.community_control where id = true for update;
  if not found then raise exception 'Backend control missing'; end if;
  delete from public.community_feedback where at < now() - interval '90 days';
  delete from public.community_activity where revoked_until <= now()
    or (revoked_until is null and last_seen < today - 30);
  select jsonb_build_object(
    'feedbackCount', count(*),
    'featureRequests', count(*) filter(where payload->>'category' = 'feature'),
    'bugReports', count(*) filter(where payload->>'category' = 'bug'),
    'averageRating', avg((payload->>'rating')::numeric),
    'ratingCount', count(*) filter(where payload ? 'rating'),
    'feedback', (select coalesce(jsonb_agg(payload || jsonb_build_object('id',id,'at',at) order by at desc,id),'[]'::jsonb)
      from (select * from public.community_feedback order by at desc,id limit 100) recent),
    'retainedOptInInstallations', (select count(*) from public.community_activity where revoked_until is null),
    'activeOptInInstallationsLastSevenDays', (select count(*) from public.community_activity where revoked_until is null and last_seen >= today - 7),
    'measuredAt', now(), 'githubStars', null, 'githubClones', null, 'releaseDownloads', null,
    'note', 'Opt-in browsers, not people or downloads. Inactive activity and revocation markers expire after 30 days; feedback expires after 90 days. Cleanup runs on the next store operation. GitHub metrics are unavailable.'
  ) into result from public.community_feedback;
  return result;
end $$;

revoke all on function public.gateway_backend_status(), public.gateway_admit_request(text),
  public.community_write(text,text,jsonb), public.community_snapshot() from public, anon, authenticated;
grant execute on function public.gateway_backend_status(), public.gateway_admit_request(text),
  public.community_write(text,text,jsonb), public.community_snapshot() to service_role;
