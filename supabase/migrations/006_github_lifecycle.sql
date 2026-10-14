-- Shared, one-use OAuth state and compare-and-swap token rotation.
-- Service role only: neither tokens nor PKCE verifiers are browser-readable.
alter table public.github_connections
  add column refresh_lease uuid,
  add column refresh_until timestamptz;

create table public.github_oauth_pending (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  state_hash text not null unique check (length(state_hash) = 64),
  encrypted_pending text,
  consumed boolean not null default false,
  expires_at timestamptz not null
);
alter table public.github_oauth_pending enable row level security;
revoke all on public.github_oauth_pending from public, anon, authenticated;
grant all on public.github_oauth_pending, public.github_connections to service_role;

create function public.github_begin_connection(p_owner uuid, p_hash text, p_pending text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text, 604));
  if length(p_pending) > 16000 then raise exception 'Pending credential too large'; end if;
  insert into public.github_oauth_pending(owner_id,state_hash,encrypted_pending,expires_at)
  values(p_owner,p_hash,p_pending,now()+interval '10 minutes')
  on conflict(owner_id) do update set state_hash=excluded.state_hash,
    encrypted_pending=excluded.encrypted_pending, consumed=false, expires_at=excluded.expires_at;
end $$;

create function public.github_consume_state(p_hash text)
returns text language plpgsql security invoker set search_path = '' as $$
declare owner uuid; pending text;
begin
  select owner_id into owner from public.github_oauth_pending where state_hash=p_hash;
  if owner is null then return null; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner::text, 604));
  select encrypted_pending into pending from public.github_oauth_pending
    where owner_id=owner and state_hash=p_hash and not consumed and expires_at>now() for update;
  if pending is null then return null; end if;
  update public.github_oauth_pending set consumed=true, encrypted_pending=null where owner_id=owner;
  return pending;
end $$;

create function public.github_complete_connection(p_owner uuid, p_hash text, p_token text, p_login text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text, 604));
  if not exists(select 1 from public.github_oauth_pending where owner_id=p_owner
    and state_hash=p_hash and consumed and expires_at>now()) then return false; end if;
  if length(p_token)>16000 or length(p_login)>100 then raise exception 'Invalid credential size'; end if;
  insert into public.github_connections(owner_id,login,encrypted_token)
    values(p_owner,p_login,p_token)
  on conflict(owner_id) do update set login=excluded.login, encrypted_token=excluded.encrypted_token,
    updated_at=now(), refresh_lease=null, refresh_until=null;
  delete from public.github_oauth_pending where owner_id=p_owner;
  return true;
end $$;

create function public.github_claim_refresh(p_owner uuid, p_previous text, p_lease uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.github_connections set refresh_lease=p_lease, refresh_until=now()+interval '60 seconds'
    where owner_id=p_owner and encrypted_token=p_previous
    and (refresh_until is null or refresh_until<=now());
  return found;
end $$;

create function public.github_finish_refresh(p_owner uuid, p_previous text, p_lease uuid, p_token text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if length(p_token)>16000 then raise exception 'Invalid credential size'; end if;
  update public.github_connections set encrypted_token=p_token, updated_at=now(),
    refresh_lease=null, refresh_until=null
    where owner_id=p_owner and encrypted_token=p_previous and refresh_lease=p_lease and refresh_until>now();
  return found;
end $$;

create function public.github_release_refresh(p_owner uuid, p_previous text, p_lease uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.github_connections set refresh_lease=null, refresh_until=null
    where owner_id=p_owner and encrypted_token=p_previous and refresh_lease=p_lease;
end $$;

create function public.github_disconnect(p_owner uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text, 604));
  delete from public.github_oauth_pending where owner_id=p_owner;
  delete from public.github_connections where owner_id=p_owner;
end $$;

revoke all on function public.github_begin_connection(uuid,text,text),
 public.github_consume_state(text), public.github_complete_connection(uuid,text,text,text),
 public.github_claim_refresh(uuid,text,uuid), public.github_finish_refresh(uuid,text,uuid,text),
 public.github_release_refresh(uuid,text,uuid), public.github_disconnect(uuid) from public,anon,authenticated;
grant execute on function public.github_begin_connection(uuid,text,text),
 public.github_consume_state(text), public.github_complete_connection(uuid,text,text,text),
 public.github_claim_refresh(uuid,text,uuid), public.github_finish_refresh(uuid,text,uuid,text),
 public.github_release_refresh(uuid,text,uuid), public.github_disconnect(uuid) to service_role;
