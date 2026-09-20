-- Immutable sources, durable analysis jobs, and non-destructive publication.
-- No existing findings, verdicts, notes, or research records are deleted.
create extension if not exists pgcrypto;

create table public.artifact_transcript_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_hash text not null,
  schema_version integer not null default 1,
  raw_text text not null,
  segments jsonb not null check (jsonb_typeof(segments) = 'array'),
  source text not null,
  created_at timestamptz not null default now(),
  unique (artifact_id, content_hash, schema_version)
);
-- Retain every pre-migration source before a future paste/format replaces raw_text.
insert into public.artifact_transcript_versions(artifact_id,user_id,content_hash,schema_version,raw_text,segments,source)
select a.id,a.user_id,encode(digest(a.raw_text,'sha256'),'hex'),0,a.raw_text,
  coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'text',s.text,'start_seconds',s.start_seconds,
    'end_seconds',s.end_seconds,'timing','unavailable') order by s.seq) from public.artifact_transcript_segments s where s.artifact_id = a.id),'[]'),
  'legacy_snapshot'
from public.artifacts a where length(coalesce(a.raw_text,'')) > 0;
alter table public.artifact_transcript_segments alter column start_seconds drop not null;
alter table public.artifact_transcript_chunks alter column start_seconds drop not null;
alter table public.artifact_transcript_segments add column transcript_version_id uuid references public.artifact_transcript_versions(id) on delete set null;
alter table public.artifact_transcript_segments add column source_segment_id text;
alter table public.artifact_transcript_segments add column timing_quality text;

create table public.artifact_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  processing_token text not null,
  transcript_version_id uuid not null references public.artifact_transcript_versions(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','partial','failed','complete','superseded')),
  error_code text,
  error text,
  summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (artifact_id, processing_token)
);
create table public.artifact_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.artifact_analysis_runs(id) on delete cascade,
  stage text not null check (stage in ('extract','consolidate')),
  ordinal integer not null,
  payload jsonb not null default '{}',
  result jsonb,
  status text not null default 'queued' check (status in ('queued','running','retry','done','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  error_code text,
  error text,
  created_at timestamptz not null default now(),
  unique (run_id, stage, ordinal)
);
create index artifact_analysis_jobs_available on public.artifact_analysis_jobs (available_at, created_at)
  where status in ('queued','retry','running');

alter table public.artifact_claims add column if not exists analysis_run_id uuid references public.artifact_analysis_runs(id) on delete set null;
alter table public.artifact_claims add column if not exists claim_key text;
alter table public.artifact_claims add column if not exists is_current boolean not null default true;
alter table public.artifact_claims add column if not exists needs_review boolean not null default false;
alter table public.artifact_claims add column if not exists source_evidence jsonb;
alter table public.artifact_claims add column if not exists importance_score real not null default 0;
alter table public.artifact_claims add column if not exists importance_reason text;
alter table public.artifact_claims add column if not exists finding_kind text;
create unique index artifact_claim_key_unique on public.artifact_claims (artifact_id, claim_key) where claim_key is not null;

create table public.artifact_finding_versions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.artifact_analysis_runs(id) on delete cascade,
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_id uuid references public.artifact_claims(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, claim_id)
);
insert into public.artifact_finding_versions (artifact_id,user_id,claim_id,payload)
select artifact_id,user_id,id,to_jsonb(c) - 'embedding' from public.artifact_claims c;

alter table public.artifact_transcript_versions enable row level security;
alter table public.artifact_analysis_runs enable row level security;
alter table public.artifact_analysis_jobs enable row level security;
alter table public.artifact_finding_versions enable row level security;
create policy transcript_versions_owner_read on public.artifact_transcript_versions for select to authenticated using (user_id = auth.uid());
create policy analysis_runs_owner_read on public.artifact_analysis_runs for select to authenticated using (user_id = auth.uid());
create policy analysis_jobs_owner_read on public.artifact_analysis_jobs for select to authenticated using (
  exists(select 1 from public.artifact_analysis_runs r where r.id = run_id and r.user_id = auth.uid())
);
create policy finding_versions_owner_read on public.artifact_finding_versions for select to authenticated using (user_id = auth.uid());
grant select on public.artifact_transcript_versions, public.artifact_analysis_runs, public.artifact_analysis_jobs, public.artifact_finding_versions to authenticated;
grant all on public.artifact_transcript_versions, public.artifact_analysis_runs, public.artifact_analysis_jobs, public.artifact_finding_versions to service_role;

-- Also protects research from an older browser/function that still issues DELETE on re-analysis.
create or replace function public.protect_artifact_finding_history() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if exists(select 1 from public.artifacts where id = old.artifact_id) then
    raise exception 'Archive a finding instead of deleting its research history' using errcode = '55000';
  end if;
  return old; -- Parent-artifact deletion is intentional and may still cascade.
end $$;
create trigger protect_artifact_finding_history before delete on public.artifact_claims
for each row execute function public.protect_artifact_finding_history();

create or replace function public.artifact_analysis_progress(p_run_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.artifact_analysis_runs; progress jsonb; total integer; done integer;
begin
  select * into r from public.artifact_analysis_runs where id = p_run_id;
  if not found then return null; end if;
  select count(*), count(*) filter(where status = 'done') into total, done
    from public.artifact_analysis_jobs where run_id = p_run_id and stage = 'extract';
  progress := jsonb_build_object('run_id',r.id,'status',r.status,'completed_batches',done,
    'total_batches',total,'transcript_version_id',r.transcript_version_id,
    'error_code',r.error_code,'message',r.error,'updated_at',r.updated_at,
    'enrichment_status','not_requested');
  update public.artifacts set metadata = jsonb_set(coalesce(metadata,'{}'),'{analysis}',progress),
    status = case when r.status = 'complete' then 'ready' when r.status in ('partial','failed') then 'error' else 'analyzing' end,
    error = case when r.status in ('partial','failed') then r.error else null end
  where id = r.artifact_id and processing_token = r.processing_token and r.status <> 'superseded';
  return progress;
end $$;

-- The immutable version is authoritative; these two tables are replaceable current-version indexes.
create or replace function public.artifact_sync_transcript_cache(p_version_id uuid) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v public.artifact_transcript_versions; source_kind public.transcript_segment_source;
begin
  select * into v from public.artifact_transcript_versions where id = p_version_id and schema_version = 1;
  if not found then raise exception 'Canonical transcript version missing'; end if;
  if exists(select 1 from public.artifact_transcript_segments where artifact_id = v.artifact_id and transcript_version_id = v.id)
    and not exists(select 1 from public.artifact_transcript_segments where artifact_id = v.artifact_id and transcript_version_id is distinct from v.id) then return; end if;
  source_kind := case when v.source ilike '%paste%' then 'paste'::public.transcript_segment_source
    when v.source ilike '%deepgram%' then 'deepgram'::public.transcript_segment_source
    when v.source ilike '%gemini%' then 'gemini'::public.transcript_segment_source
    when v.source ilike '%caption%' then 'caption'::public.transcript_segment_source
    else 'third_party'::public.transcript_segment_source end;
  delete from public.artifact_transcript_segments where artifact_id = v.artifact_id;
  delete from public.artifact_transcript_chunks where artifact_id = v.artifact_id;
  insert into public.artifact_transcript_segments(artifact_id,user_id,seq,start_seconds,end_seconds,text,source,
    transcript_version_id,source_segment_id,timing_quality)
  select v.artifact_id,v.user_id,ordinality::integer-1,(value->>'start_seconds')::numeric::integer,
    (value->>'end_seconds')::numeric::integer,value->>'text',source_kind,v.id,value->>'id',value->>'timing'
  from jsonb_array_elements(v.segments) with ordinality;
  insert into public.artifact_transcript_chunks(artifact_id,user_id,start_seconds,end_seconds,text,metadata)
  select v.artifact_id,v.user_id,min((value->>'start_seconds')::numeric)::integer,
    max((value->>'end_seconds')::numeric)::integer,string_agg(value->>'text',' ' order by ordinality),
    jsonb_build_object('transcript_version_id',v.id,'content_hash',v.content_hash,
      'source_segment_ids',jsonb_agg(value->>'id' order by ordinality),
      'timing_quality',case when bool_or(value->>'timing' = 'unavailable') then 'unavailable'
        when bool_or(value->>'timing' = 'estimated') then 'estimated' else 'measured' end)
  from jsonb_array_elements(v.segments) with ordinality group by (ordinality-1)/3;
end $$;
revoke all on function public.artifact_sync_transcript_cache(uuid) from public,anon,authenticated;
grant execute on function public.artifact_sync_transcript_cache(uuid) to service_role;

create or replace function public.artifact_start_analysis(
  p_artifact_id uuid, p_user_id uuid, p_processing_token text, p_content_hash text,
  p_segments jsonb, p_batches jsonb, p_source text, p_resume boolean default false
) returns uuid
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare a public.artifacts; rid uuid; vid uuid; batch jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_artifact_id::text, 0));
  select * into a from public.artifacts where id = p_artifact_id for update;
  if not found or a.user_id <> p_user_id or a.processing_token is distinct from p_processing_token then
    raise exception 'Stale analysis request' using errcode = '40001';
  end if;
  if encode(digest(coalesce(a.raw_text,''),'sha256'),'hex') <> p_content_hash then
    raise exception 'Transcript changed before analysis' using errcode = '40001';
  end if;
  select id into rid from public.artifact_analysis_runs where artifact_id = a.id and processing_token = p_processing_token;
  if found then
    if not exists(select 1 from public.artifact_analysis_runs ar join public.artifact_transcript_versions tv on tv.id = ar.transcript_version_id
      where ar.id = rid and tv.content_hash = p_content_hash) then
      raise exception 'Transcript changed; start a new analysis version' using errcode = '40001';
    end if;
    if p_resume then
      update public.artifact_analysis_jobs set status = 'queued',attempts = 0,available_at = now(),lease_token = null,lease_until = null,error = null,error_code = null
      where run_id = rid and status = 'failed';
      update public.artifact_analysis_runs set status = 'queued',error = null,error_code = null,updated_at = now()
      where id = rid and status in ('partial','failed');
    end if;
    perform public.artifact_analysis_progress(rid);
    return rid;
  end if;
  if jsonb_typeof(p_segments) <> 'array' or jsonb_typeof(p_batches) <> 'array'
    or jsonb_array_length(p_segments) = 0 or jsonb_array_length(p_batches) = 0
    or jsonb_array_length(p_batches) > 1000 then raise exception 'Invalid analysis plan'; end if;
  insert into public.artifact_transcript_versions (artifact_id,user_id,content_hash,raw_text,segments,source)
  values (a.id,a.user_id,p_content_hash,a.raw_text,p_segments,p_source)
  on conflict (artifact_id,content_hash,schema_version) do nothing;
  select id into vid from public.artifact_transcript_versions where artifact_id = a.id and content_hash = p_content_hash and schema_version = 1;
  perform public.artifact_sync_transcript_cache(vid);
  update public.artifact_analysis_runs set status = 'superseded',updated_at = now()
  where artifact_id = a.id and status in ('queued','running','partial','failed');
  insert into public.artifact_analysis_runs (artifact_id,user_id,processing_token,transcript_version_id)
  values(a.id,a.user_id,p_processing_token,vid) returning id into rid;
  for batch in select value from jsonb_array_elements(p_batches) loop
    insert into public.artifact_analysis_jobs(run_id,stage,ordinal,payload)
    values(rid,'extract',(batch->>'ordinal')::integer,batch);
  end loop;
  perform public.artifact_analysis_progress(rid);
  return rid;
end $$;

create or replace function public.artifact_claim_analysis_job(p_run_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare j public.artifact_analysis_jobs; r public.artifact_analysis_runs;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('yourbible-artifact-analysis-queue',0)) then return null; end if;
  -- A dead worker can be reclaimed, but not retried forever.
  update public.artifact_analysis_jobs set status = 'failed',error_code = 'worker_expired',
    error = 'A worker stopped repeatedly. Retry unfinished analysis to continue.'
  where status = 'running' and lease_until < now() and attempts >= 3;
  for r in select distinct ar.* from public.artifact_analysis_runs ar join public.artifact_analysis_jobs aj on aj.run_id = ar.id
    where ar.status in ('queued','running') and aj.status = 'failed' loop
    update public.artifact_analysis_runs set status = 'partial',error_code = 'worker_expired',
      error = 'Analysis is incomplete. Saved transcript and previous research are preserved.',updated_at = now() where id = r.id;
    perform public.artifact_analysis_progress(r.id);
  end loop;
  if (select count(*) from public.artifact_analysis_jobs where status = 'running' and lease_until > now()) >= 2 then return null; end if;
  select aj.* into j from public.artifact_analysis_jobs aj
  join public.artifact_analysis_runs ar on ar.id = aj.run_id
  join public.artifacts a on a.id = ar.artifact_id and a.processing_token = ar.processing_token
  where (p_run_id is null or aj.run_id = p_run_id) and ar.status in ('queued','running')
    and aj.attempts < 3 and ((aj.status in ('queued','retry') and aj.available_at <= now())
      or (aj.status = 'running' and aj.lease_until < now()))
  order by ar.updated_at, aj.available_at, aj.created_at, aj.ordinal
  limit 1 for update of aj skip locked;
  if not found then return null; end if;
  update public.artifact_analysis_jobs set status = 'running',attempts = attempts + 1,
    lease_token = gen_random_uuid(),lease_until = now() + interval '180 seconds'
  where id = j.id returning * into j;
  update public.artifact_analysis_runs set status = 'running',updated_at = now() where id = j.run_id;
  perform public.artifact_analysis_progress(j.run_id);
  return to_jsonb(j);
end $$;

create or replace function public.artifact_complete_analysis_job(p_job_id uuid,p_lease_token uuid,p_result jsonb) returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare j public.artifact_analysis_jobs; r public.artifact_analysis_runs;
begin
  select * into j from public.artifact_analysis_jobs where id = p_job_id;
  if not found then return false; end if;
  select * into r from public.artifact_analysis_runs where id = j.run_id;
  perform pg_advisory_xact_lock(hashtextextended(r.artifact_id::text, 0));
  if not exists(select 1 from public.artifacts where id = r.artifact_id and processing_token = r.processing_token)
    or r.status not in ('queued','running') then return false; end if;
  update public.artifact_analysis_jobs set status = 'done',result = p_result,lease_until = null,error = null,error_code = null
  where id = p_job_id and status = 'running' and lease_token = p_lease_token and lease_until > now();
  if not found then return false; end if;
  if j.stage = 'extract' and not exists(select 1 from public.artifact_analysis_jobs where run_id = r.id and stage = 'extract' and status <> 'done') then
    insert into public.artifact_analysis_jobs(run_id,stage,ordinal) values(r.id,'consolidate',0)
    on conflict (run_id,stage,ordinal) do nothing;
  end if;
  update public.artifact_analysis_runs set updated_at = now() where id = r.id;
  perform public.artifact_analysis_progress(r.id);
  return true;
end $$;

create or replace function public.artifact_fail_analysis_job(
  p_job_id uuid,p_lease_token uuid,p_code text,p_message text,p_retryable boolean
) returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare j public.artifact_analysis_jobs; r public.artifact_analysis_runs; retry boolean;
begin
  select * into j from public.artifact_analysis_jobs where id = p_job_id;
  if not found then return false; end if;
  select * into r from public.artifact_analysis_runs where id = j.run_id;
  perform pg_advisory_xact_lock(hashtextextended(r.artifact_id::text, 0));
  if not exists(select 1 from public.artifacts where id = r.artifact_id and processing_token = r.processing_token)
    or r.status not in ('queued','running') then return false; end if;
  retry := p_retryable and j.attempts < 3;
  update public.artifact_analysis_jobs set status = case when retry then 'retry' else 'failed' end,
    available_at = now() + make_interval(secs => 30 * power(2,j.attempts)::integer),lease_until = null,
    error_code = left(p_code,80),error = left(p_message,500)
  where id = j.id and status = 'running' and lease_token = p_lease_token and lease_until > now();
  if not found then return false; end if;
  update public.artifact_analysis_runs set
    status = case when retry then 'running' when exists(select 1 from public.artifact_analysis_jobs where run_id = r.id and stage = 'extract' and status = 'done') then 'partial' else 'failed' end,
    error_code = left(p_code,80),error = left(p_message,500),updated_at = now() where id = r.id;
  perform public.artifact_analysis_progress(r.id);
  return true;
end $$;

create or replace function public.artifact_publish_analysis(
  p_job_id uuid,p_lease_token uuid,p_findings jsonb,p_summary jsonb
) returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare j public.artifact_analysis_jobs; r public.artifact_analysis_runs; a public.artifacts;
  v public.artifact_transcript_versions; f jsonb; cid uuid; k text; ev jsonb;
begin
  select * into j from public.artifact_analysis_jobs where id = p_job_id;
  if not found or j.stage <> 'consolidate' then return false; end if;
  select * into r from public.artifact_analysis_runs where id = j.run_id;
  perform pg_advisory_xact_lock(hashtextextended(r.artifact_id::text,0));
  select * into a from public.artifacts where id = r.artifact_id for update;
  select * into v from public.artifact_transcript_versions where id = r.transcript_version_id;
  if not found or a.processing_token is distinct from r.processing_token or r.status <> 'running'
    or encode(digest(coalesce(a.raw_text,''),'sha256'),'hex') <> v.content_hash then return false; end if;
  if not exists(select 1 from public.artifact_analysis_jobs where id = j.id and status = 'running'
      and lease_token = p_lease_token and lease_until > now()) then return false; end if;
  if exists(select 1 from public.artifact_analysis_jobs where run_id = r.id and stage = 'extract' and status <> 'done') then
    raise exception 'Cannot publish incomplete analysis'; end if;
  if jsonb_typeof(p_findings) <> 'array' or jsonb_array_length(p_findings) > 12000 then raise exception 'Invalid findings'; end if;
  -- Archive, never delete. Existing FK-linked research stays attached to its finding.
  update public.artifact_claims set is_current = false where artifact_id = a.id;
  for f in select value from jsonb_array_elements(p_findings) loop
    if length(trim(coalesce(f->>'claim',''))) < 15 or length(trim(coalesce(f#>>'{source_evidence,quote}',''))) < 12 then
      raise exception 'Finding has no source evidence'; end if;
    k := lower(regexp_replace(trim(f->>'claim'),'\s+',' ','g'));
    ev := (f->'source_evidence') || jsonb_build_object('transcript_version_id',v.id,'content_hash',v.content_hash);
    select id into cid from public.artifact_claims where artifact_id = a.id
      and (claim_key = k or (claim_key is null and lower(regexp_replace(trim(claim),'\s+',' ','g')) = k))
      order by (verdict is not null) desc,created_at,id limit 1;
    if found then
      update public.artifact_claims set is_current = true,analysis_run_id = r.id,claim_key = k,
        needs_review = needs_review or (verdict is not null and source_evidence is distinct from ev),
        source_evidence = ev,importance_score = (f->>'importance_score')::real,
        importance_reason = f->>'importance_reason',finding_kind = f->>'finding_kind'
      where id = cid; -- Deliberately do not overwrite verdict, user_note, deferred_at, or existing research.
    else
      insert into public.artifact_claims(user_id,artifact_id,claim,claim_key,is_current,analysis_run_id,
        source_evidence,importance_score,importance_reason,finding_kind,doctrine_tags,
        scripture_supports,scripture_challenges,bias_flags,epistemology,match_relation,chapter_start_seconds)
      values(a.user_id,a.id,f->>'claim',k,true,r.id,ev,(f->>'importance_score')::real,
        f->>'importance_reason',f->>'finding_kind',array(select jsonb_array_elements_text(coalesce(f->'doctrine_tags','[]'))),
        '[]','[]','{}','{}','new',null) returning id into cid;
    end if;
    insert into public.artifact_finding_versions(run_id,artifact_id,user_id,claim_id,payload)
    values(r.id,a.id,a.user_id,cid,f || jsonb_build_object('source_evidence',ev));
  end loop;
  update public.artifact_analysis_jobs set status = 'done',result = p_summary,lease_until = null where id = j.id;
  update public.artifact_analysis_runs set status = 'complete',summary = p_summary,error = null,error_code = null,
    updated_at = now(),published_at = now() where id = r.id;
  update public.artifacts set metadata = coalesce(metadata,'{}') || jsonb_build_object('findings_overview',p_summary)
    where id = a.id and processing_token = r.processing_token;
  perform public.artifact_analysis_progress(r.id);
  return true;
end $$;

-- Only authenticated edge workers may mutate runs, jobs, or publication.
revoke all on function public.artifact_analysis_progress(uuid) from public,anon,authenticated;
revoke all on function public.artifact_start_analysis(uuid,uuid,text,text,jsonb,jsonb,text,boolean) from public,anon,authenticated;
revoke all on function public.artifact_claim_analysis_job(uuid) from public,anon,authenticated;
revoke all on function public.artifact_complete_analysis_job(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.artifact_fail_analysis_job(uuid,uuid,text,text,boolean) from public,anon,authenticated;
revoke all on function public.artifact_publish_analysis(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.artifact_analysis_progress(uuid),public.artifact_start_analysis(uuid,uuid,text,text,jsonb,jsonb,text,boolean),
  public.artifact_claim_analysis_job(uuid),public.artifact_complete_analysis_job(uuid,uuid,jsonb),
  public.artifact_fail_analysis_job(uuid,uuid,text,text,boolean),public.artifact_publish_analysis(uuid,uuid,jsonb,jsonb) to service_role;
