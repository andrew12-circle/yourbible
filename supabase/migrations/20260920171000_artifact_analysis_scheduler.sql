-- Deployment prerequisite: enable pg_net/pg_cron, set the two Vault secrets below,
-- and set the matching ARTIFACT_ANALYSIS_WORKER_SECRET in Edge Function secrets.
-- The worker URL should be <project origin>/functions/v1/framework-analysis-worker.
-- Never put a service-role key in the browser or in source control.
create or replace function public.dispatch_artifact_analysis_jobs() returns integer
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare worker_url text; worker_secret text; requests integer := 0; i integer;
begin
  if not exists(select 1 from public.artifact_analysis_jobs j join public.artifact_analysis_runs r on r.id = j.run_id
    where r.status in ('queued','running') and ((j.status in ('queued','retry') and j.available_at <= now())
      or (j.status = 'running' and j.lease_until < now()))) then return 0; end if;
  if to_regclass('vault.decrypted_secrets') is null or not exists(select 1 from pg_extension where extname = 'pg_net') then
    raise warning 'Artifact analysis scheduler needs Vault and pg_net'; return 0;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into worker_url using 'artifact_analysis_worker_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into worker_secret using 'artifact_analysis_worker_secret';
  if worker_url is null or worker_secret is null or worker_url !~ '^https://[^/]+/functions/v1/framework-analysis-worker$' then
    raise warning 'Artifact analysis scheduler secrets are not configured'; return 0;
  end if;
  -- Bound concurrent model calls; expired leases are eligible for recovery.
  for i in 1..greatest(0, 2 - (select count(*)::integer from public.artifact_analysis_jobs where status = 'running' and lease_until > now())) loop
    execute 'select net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 10000)'
      using worker_url, jsonb_build_object('Content-Type','application/json','x-artifact-worker-secret',worker_secret), '{}'::jsonb;
    requests := requests + 1;
  end loop;
  return requests;
end $$;
revoke all on function public.dispatch_artifact_analysis_jobs() from public,anon,authenticated;
grant execute on function public.dispatch_artifact_analysis_jobs() to service_role;

do $$
begin
  if exists(select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('artifact-analysis-worker','* * * * *','select public.dispatch_artifact_analysis_jobs()');
  else
    raise notice 'Enable pg_cron, then schedule public.dispatch_artifact_analysis_jobs() every minute before enabling the new analysis worker.';
  end if;
end $$;
