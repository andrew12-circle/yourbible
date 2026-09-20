-- This service-only probe prevents a preview/new browser from using an incompatible deployment.
create or replace function public.artifact_analysis_capabilities() returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare worker_url text; worker_secret text; scheduled boolean := false;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regclass('cron.job') is null
    or not exists(select 1 from pg_extension where extname = 'pg_net') then
    return jsonb_build_object('contract',2,'queue_ready',false);
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into worker_url using 'artifact_analysis_worker_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into worker_secret using 'artifact_analysis_worker_secret';
  execute 'select exists(select 1 from cron.job where jobname = $1 and active)'
    into scheduled using 'artifact-analysis-worker';
  return jsonb_build_object('contract',2,
    'queue_ready',scheduled and worker_url is not null and length(coalesce(worker_secret,'')) >= 32,
    'worker_url',worker_url,
    'worker_secret_sha256',case when worker_secret is null then null else encode(digest(worker_secret,'sha256'),'hex') end);
end $$;
revoke all on function public.artifact_analysis_capabilities() from public,anon,authenticated;
grant execute on function public.artifact_analysis_capabilities() to service_role;

create or replace function public.artifact_fence_superseded_jobs() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.artifact_analysis_jobs set status = 'failed',lease_token = null,lease_until = null,
    error_code = 'superseded',error = 'A newer analysis version replaced this unfinished run.'
  where run_id = new.id and status <> 'done';
  return new;
end $$;
create trigger artifact_fence_superseded_jobs after update of status on public.artifact_analysis_runs
for each row when (new.status = 'superseded' and old.status is distinct from new.status)
execute function public.artifact_fence_superseded_jobs();
