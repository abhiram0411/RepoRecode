-- Read-only verification of applied migrations. Run each SELECT separately.
-- Migration 007 was applied and verified in production on 26 October 2026.
-- Catalog checks do not replace two-account REST/Auth acceptance.
select c.relname as table_name, c.relrowsecurity as rls,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_read,
  has_table_privilege('authenticated', c.oid, 'SELECT') as member_read,
  has_table_privilege('service_role', c.oid, 'SELECT') as server_read,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

select p.proname as function_name,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as member_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as server_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname like 'github_%' or p.proname like 'community_%'
    or p.proname like 'gateway_%' or p.proname in ('admin_snapshot', 'reserve_tutor_request'))
order by p.proname;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;
