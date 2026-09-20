-- Install durable wakeups where Supabase's supported extensions are available.
-- No secret is embedded in this migration; the authenticated edge controller vaults its service credential.
begin;
do $$ begin
  if exists(select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
  if exists(select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
  end if;
  if exists(select 1 from pg_available_extensions where name = 'supabase_vault') then
    create extension if not exists supabase_vault with schema vault;
  end if;
end $$;

create schema if not exists artifact_private;
revoke all on schema artifact_private from public, anon, authenticated;
create table artifact_private.artifact_analysis_dispatch_config (
  singleton boolean primary key default true check(singleton),
  worker_url text not null,
  secret_id uuid not null
);
revoke all on artifact_private.artifact_analysis_dispatch_config from public, anon, authenticated;

create function public.artifact_analysis_configure_dispatcher(p_url text, p_token text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare sid uuid; old_token text;
begin
  if p_url !~ '^https://[^/]+/functions/v1/artifact-analysis-worker$' or length(p_token) < 30 then
    raise exception 'Invalid dispatcher configuration';
  end if;
  if to_regclass('vault.decrypted_secrets') is null or to_regclass('cron.job') is null or to_regnamespace('net') is null then
    raise exception 'Enable Supabase Vault, pg_cron and pg_net before starting durable analysis';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('artifact-analysis-dispatcher',0));
  select secret_id into sid from artifact_private.artifact_analysis_dispatch_config where singleton;
  if sid is null then
    execute 'select vault.create_secret($1,$2,$3)' into sid using p_token,'artifact_analysis_worker_token','Internal analysis worker credential';
    insert into artifact_private.artifact_analysis_dispatch_config(worker_url,secret_id) values(p_url,sid);
  else
    execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into old_token using sid;
    if old_token is distinct from p_token then execute 'select vault.update_secret($1,$2)' using sid,p_token; end if;
    update artifact_private.artifact_analysis_dispatch_config set worker_url=p_url where singleton;
  end if;
  execute $sql$select cron.schedule('artifact-analysis-recovery','* * * * *','select public.artifact_analysis_dispatch();')$sql$;
end $$;

create function public.artifact_analysis_dispatch() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare cfg artifact_private.artifact_analysis_dispatch_config; credential text; run record; dispatched integer := 0;
begin
  select * into cfg from artifact_private.artifact_analysis_dispatch_config where singleton;
  if not found then return 0; end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into credential using cfg.secret_id;
  if credential is null then return 0; end if;
  for run in select id from public.artifact_analysis_runs
      where next_attempt_at <= now() and (status='queued' or (status='running' and lease_expires_at < now()))
      order by next_attempt_at,created_at limit 4 loop
    execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 10000)'
      using cfg.worker_url,jsonb_build_object('run_id',run.id),
      jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || credential);
    dispatched := dispatched + 1;
  end loop;
  return dispatched;
end $$;
revoke all on function public.artifact_analysis_configure_dispatcher(text,text), public.artifact_analysis_dispatch() from public, anon, authenticated;
grant execute on function public.artifact_analysis_configure_dispatcher(text,text), public.artifact_analysis_dispatch() to service_role;
commit;
