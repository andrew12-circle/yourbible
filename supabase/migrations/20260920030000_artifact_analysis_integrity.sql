-- Durable, leased analysis checkpoints. Old findings are retired, never deleted by re-analysis.
begin;

create table public.artifact_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  processing_token text not null,
  transcript_hash text not null,
  transcript_text text not null,
  batches jsonb not null check (jsonb_typeof(batches) = 'array' and jsonb_array_length(batches) > 0),
  next_batch integer not null default 0 check (next_batch >= 0),
  candidates jsonb not null default '[]'::jsonb check (jsonb_typeof(candidates) = 'array'),
  status text not null default 'queued' check (status in ('queued','running','partial','complete','failed','superseded')),
  phase text not null default 'extract' check (phase in ('extract','rank','complete')),
  attempts integer not null default 0,
  lease_token uuid,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  error text,
  analysis_version text not null default 'artifact-evidence-v2',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(artifact_id, processing_token)
);
create index artifact_analysis_pending on public.artifact_analysis_runs(next_attempt_at, created_at)
  where status in ('queued','running');
alter table public.artifact_analysis_runs enable row level security;
create policy artifact_analysis_runs_owner_read on public.artifact_analysis_runs
  for select to authenticated using (user_id = auth.uid());
grant select on public.artifact_analysis_runs to authenticated;
revoke insert, update, delete on public.artifact_analysis_runs from anon, authenticated;
grant all on public.artifact_analysis_runs to service_role;

alter table public.artifact_claims
  add column analysis_run_id uuid references public.artifact_analysis_runs(id) on delete set null,
  add column source_quote text,
  add column source_segment_ids text[],
  add column source_start_seconds integer,
  add column source_end_seconds integer,
  add column source_timing_kind text check (source_timing_kind in ('measured','estimated','unavailable')),
  add column importance_score integer check (importance_score between 0 and 100),
  add column importance_reason text,
  add column is_primary boolean not null default false,
  add column retired_at timestamptz;
create index artifact_claims_active_artifact on public.artifact_claims(artifact_id) where retired_at is null;

-- Archive source changes from every ingress path, including manual paste and caption refresh.
create table public.artifact_transcript_revisions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null, metadata jsonb, archived_at timestamptz not null default now()
);
alter table public.artifact_transcript_revisions enable row level security;
create policy artifact_transcript_revisions_owner_read on public.artifact_transcript_revisions
  for select to authenticated using (user_id = auth.uid());
grant select on public.artifact_transcript_revisions to authenticated;
grant all on public.artifact_transcript_revisions to service_role;
revoke insert, update, delete on public.artifact_transcript_revisions from anon, authenticated;
create function public.artifact_archive_source_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.raw_text is distinct from new.raw_text then
    if length(coalesce(old.raw_text,'')) > 0 then
      insert into public.artifact_transcript_revisions(artifact_id,user_id,raw_text,metadata)
      values(old.id,old.user_id,old.raw_text,old.metadata);
    end if;
    -- Old derived search data must not masquerade as the corrected transcript.
    delete from public.artifact_transcript_segments where artifact_id = old.id;
    delete from public.artifact_transcript_chunks where artifact_id = old.id;
    new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object('transcript_index_state','pending');
  end if;
  return new;
end $$;
create trigger artifact_archive_source_change before update of raw_text on public.artifacts
  for each row execute function public.artifact_archive_source_change();
revoke all on function public.artifact_archive_source_change() from public, anon, authenticated;

-- One advisory lock order prevents start/checkpoint/publish races and deadlocks.
create function public.artifact_analysis_lock(p_run_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare aid uuid;
begin
  select artifact_id into aid from public.artifact_analysis_runs where id = p_run_id;
  if aid is not null then perform pg_advisory_xact_lock(hashtextextended(aid::text,0)); end if;
end $$;
revoke all on function public.artifact_analysis_lock(uuid) from public, anon, authenticated;

-- Canonical segments and search chunks are rebuilt before any paid model call.
create function public.artifact_analysis_sync_transcript(p_run_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.artifact_analysis_runs; section jsonb; segment jsonb; seq integer := 0;
  source_kind public.transcript_segment_source;
begin
  select * into r from public.artifact_analysis_runs where id = p_run_id;
  if not found then return; end if;
  select case when metadata->>'transcript_source' in ('caption','third_party','deepgram','gemini','paste')
    then (metadata->>'transcript_source')::public.transcript_segment_source else 'paste'::public.transcript_segment_source end
    into source_kind from public.artifacts where id = r.artifact_id;
  delete from public.artifact_transcript_segments where artifact_id = r.artifact_id;
  delete from public.artifact_transcript_chunks where artifact_id = r.artifact_id;
  for section in select value from jsonb_array_elements(r.batches) loop
    for segment in select value from jsonb_array_elements(section->'segments') loop
      insert into public.artifact_transcript_segments(artifact_id,user_id,seq,start_seconds,end_seconds,text,source)
      values(r.artifact_id,r.user_id,seq,coalesce((segment->>'startSeconds')::integer,0),(segment->>'endSeconds')::integer,segment->>'text',source_kind);
      seq := seq + 1;
    end loop;
    -- One semantic chunk per extraction section avoids thousands of tiny embedding jobs.
    insert into public.artifact_transcript_chunks(artifact_id,user_id,start_seconds,end_seconds,text,metadata)
    select r.artifact_id,r.user_id,coalesce((section->'segments'->0->>'startSeconds')::integer,0),
      (section->'segments'->-1->>'endSeconds')::integer,
      string_agg(value->>'text',' ' order by ord),
      jsonb_build_object('analysis_run_id',r.id,'transcript_hash',r.transcript_hash,
        'timing_kind',case when bool_and(value->>'timing' = 'measured') then 'measured' else 'unavailable' end)
      from jsonb_array_elements(section->'segments') with ordinality as parts(value,ord);
  end loop;
  update public.artifacts set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('transcript_index_state','current')
    where id = r.artifact_id;
end $$;
revoke all on function public.artifact_analysis_sync_transcript(uuid) from public, anon, authenticated;

-- These functions are service-only. The edge endpoint authenticates and checks ownership first.
create function public.artifact_analysis_sync_state(p_run_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.artifact_analysis_runs;
begin
  select * into r from public.artifact_analysis_runs where id = p_run_id;
  if not found then return; end if;
  update public.artifacts set
    status = case when r.status = 'complete' then 'ready'
      when r.status in ('failed','partial') then 'error' else 'analyzing' end,
    error = r.error,
    metadata = (coalesce(metadata, '{}'::jsonb) - 'analyze_inflight_at') || jsonb_build_object('analysis_v2', jsonb_build_object(
      'run_id', r.id, 'state', r.status, 'phase', r.phase,
      'completed_sections', r.next_batch, 'total_sections', jsonb_array_length(r.batches),
      'candidate_count', jsonb_array_length(r.candidates), 'transcript_hash', r.transcript_hash,
      'updated_at', r.updated_at, 'error', r.error, 'version', r.analysis_version))
  where id = r.artifact_id and processing_token = r.processing_token and raw_text = r.transcript_text
    and r.status <> 'superseded';
end $$;

create function public.artifact_analysis_start(
  p_artifact_id uuid, p_user_id uuid, p_token text, p_text text, p_hash text, p_batches jsonb, p_resume boolean default false
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.artifact_analysis_runs; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_artifact_id::text,0));
  perform 1 from public.artifacts where id = p_artifact_id and user_id = p_user_id
    and processing_token = p_token and raw_text = p_text for update;
  if not found then raise exception 'Artifact changed; reload before starting analysis.'; end if;
  if length(p_text) > 2000000 or jsonb_typeof(p_batches) <> 'array' or jsonb_array_length(p_batches) not between 1 and 300 then
    raise exception 'Invalid or oversized analysis plan.';
  end if;
  select * into r from public.artifact_analysis_runs where artifact_id = p_artifact_id and processing_token = p_token for update;
  if found then
    if r.transcript_text <> p_text or r.transcript_hash <> p_hash then raise exception 'Transcript version changed; start a new run.'; end if;
    if p_resume and r.status in ('partial','failed') then
      update public.artifact_analysis_runs set status = 'queued', error = null, attempts = 0,
        lease_token = null, lease_expires_at = null, next_attempt_at = now(), updated_at = now() where id = r.id;
    end if;
    perform public.artifact_analysis_sync_state(r.id);
    return r.id;
  end if;
  update public.artifact_analysis_runs set status = 'superseded', lease_token = null, lease_expires_at = null, updated_at = now()
    where artifact_id = p_artifact_id and status in ('queued','running','partial','failed');
  insert into public.artifact_analysis_runs(artifact_id,user_id,processing_token,transcript_text,transcript_hash,batches)
    values(p_artifact_id,p_user_id,p_token,p_text,p_hash,p_batches) returning id into new_id;
  perform public.artifact_analysis_sync_transcript(new_id);
  perform public.artifact_analysis_sync_state(new_id);
  return new_id;
end $$;

create function public.artifact_analysis_claim(p_run_id uuid default null)
returns setof public.artifact_analysis_runs language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.artifact_analysis_runs;
begin
  select * into r from public.artifact_analysis_runs
  where (p_run_id is null or id = p_run_id) and next_attempt_at <= now()
    and (status = 'queued' or (status = 'running' and lease_expires_at < now()))
  order by next_attempt_at, created_at limit 1;
  if not found then return; end if;
  if not pg_try_advisory_xact_lock(hashtextextended(r.artifact_id::text,0)) then return; end if;
  select * into r from public.artifact_analysis_runs where id = r.id and next_attempt_at <= now()
    and (status = 'queued' or (status = 'running' and lease_expires_at < now())) for update;
  if not found then return; end if;
  if not exists(select 1 from public.artifacts where id = r.artifact_id and user_id = r.user_id
      and processing_token = r.processing_token and raw_text = r.transcript_text) then
    update public.artifact_analysis_runs set status = 'superseded', updated_at = now() where id = r.id;
    return;
  end if;
  if r.attempts >= 3 then
    update public.artifact_analysis_runs set status = 'partial', error = 'Analysis stopped after three unsuccessful attempts. Saved research is unchanged. Resume to retry this section.',
      lease_token = null, lease_expires_at = null, updated_at = now() where id = r.id;
    perform public.artifact_analysis_sync_state(r.id);
    return;
  end if;
  return query update public.artifact_analysis_runs set status = 'running', attempts = attempts + 1,
    lease_token = gen_random_uuid(), lease_expires_at = now() + interval '3 minutes', updated_at = now()
    where id = r.id returning *;
end $$;

create function public.artifact_analysis_checkpoint(p_run_id uuid, p_lease uuid, p_batch integer, p_candidates jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.artifact_analysis_runs;
begin
  perform public.artifact_analysis_lock(p_run_id);
  select * into r from public.artifact_analysis_runs where id = p_run_id for update;
  if not found or r.status <> 'running' or r.lease_token is distinct from p_lease or r.lease_expires_at < now()
      or r.next_batch <> p_batch or r.phase <> 'extract' then return false; end if;
  if jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) > 12 then raise exception 'Invalid batch results'; end if;
  if not exists(select 1 from public.artifacts where id = r.artifact_id and processing_token = r.processing_token and raw_text = r.transcript_text) then
    update public.artifact_analysis_runs set status = 'superseded', updated_at = now() where id = r.id;
    return false;
  end if;
  update public.artifact_analysis_runs set candidates = candidates || p_candidates, next_batch = next_batch + 1,
    phase = case when next_batch + 1 = jsonb_array_length(batches) then 'rank' else 'extract' end,
    status = 'queued', attempts = 0, lease_token = null, lease_expires_at = null, next_attempt_at = now(), updated_at = now()
    where id = r.id;
  perform public.artifact_analysis_sync_state(r.id);
  return true;
end $$;

create function public.artifact_analysis_fail(p_run_id uuid, p_lease uuid, p_error text, p_retryable boolean)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.artifact_analysis_runs;
begin
  perform public.artifact_analysis_lock(p_run_id);
  select * into r from public.artifact_analysis_runs where id = p_run_id for update;
  if not found or r.status <> 'running' or r.lease_token is distinct from p_lease then return false; end if;
  update public.artifact_analysis_runs set
    status = case when p_retryable and attempts < 3 then 'queued' else 'partial' end,
    error = left(p_error, 1000), lease_token = null, lease_expires_at = null,
    next_attempt_at = now() + make_interval(secs => 30 * greatest(1, attempts)), updated_at = now() where id = r.id;
  perform public.artifact_analysis_sync_state(r.id);
  return true;
end $$;

create function public.artifact_analysis_publish(p_run_id uuid, p_lease uuid, p_findings jsonb, p_overview jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.artifact_analysis_runs; finding jsonb; claim_id uuid; published uuid[] := '{}';
  quoted text;
begin
  perform public.artifact_analysis_lock(p_run_id);
  select * into r from public.artifact_analysis_runs where id = p_run_id for update;
  if not found or r.status <> 'running' or r.phase <> 'rank' or r.next_batch <> jsonb_array_length(r.batches)
      or r.lease_token is distinct from p_lease or r.lease_expires_at < now() then return false; end if;
  perform 1 from public.artifacts where id = r.artifact_id and user_id = r.user_id
    and processing_token = r.processing_token and raw_text = r.transcript_text for update;
  if not found then
    update public.artifact_analysis_runs set status = 'superseded', updated_at = now() where id = r.id;
    return false;
  end if;
  if jsonb_typeof(p_findings) <> 'array' or jsonb_array_length(p_findings) > 120 then raise exception 'Invalid published findings'; end if;
  for finding in select value from jsonb_array_elements(p_findings) loop
    -- Persist only a candidate from this run, not rewritten or invented model output.
    if not exists(select 1 from jsonb_array_elements(r.candidates) c where c->>'id' = finding->>'id'
        and c->>'claim' = finding->>'claim' and c->>'source_quote' = finding->>'source_quote'
        and c->'source_segment_ids' = finding->'source_segment_ids') then raise exception 'Finding is not in the validated candidate set'; end if;
    quoted := finding->>'source_quote';
    if quoted is null or length(quoted) < 12 then raise exception 'Finding requires source evidence'; end if;
    -- Reuse exact statements to preserve verdicts, notes and research foreign keys.
    select id into claim_id from public.artifact_claims where artifact_id = r.artifact_id
      and lower(regexp_replace(trim(claim), '\s+', ' ', 'g')) = lower(regexp_replace(trim(finding->>'claim'), '\s+', ' ', 'g'))
      order by (verdict is not null) desc, (retired_at is null) desc, created_at limit 1;
    if claim_id is null then
      insert into public.artifact_claims(user_id,artifact_id,claim) values(r.user_id,r.artifact_id,finding->>'claim') returning id into claim_id;
    end if;
    if claim_id = any(published) then raise exception 'Duplicate published statement'; end if;
    update public.artifact_claims set analysis_run_id = r.id, source_quote = quoted,
      source_segment_ids = array(select jsonb_array_elements_text(finding->'source_segment_ids')),
      source_start_seconds = (finding->>'source_start_seconds')::integer,
      source_end_seconds = (finding->>'source_end_seconds')::integer,
      source_timing_kind = finding->>'source_timing_kind',
      chapter_start_seconds = (finding->>'source_start_seconds')::integer,
      importance_score = (finding->>'importance_score')::integer,
      importance_reason = finding->>'importance_reason', is_primary = coalesce((finding->>'is_primary')::boolean,false),
      doctrine_tags = array(select jsonb_array_elements_text(finding->'doctrine_tags')),
      scripture_supports = coalesce(finding->'scripture_supports','[]'::jsonb), scripture_challenges = '[]'::jsonb,
      matched_belief_id = (finding->>'matched_belief_id')::uuid,
      match_relation = finding->>'match_relation',
      epistemology = case when coalesce(epistemology,'{}'::jsonb) <> '{}'::jsonb then epistemology else coalesce(finding->'epistemology','{}'::jsonb) end,
      retired_at = null where id = claim_id;
    published := array_append(published, claim_id);
    claim_id := null;
  end loop;
  update public.artifact_claims set retired_at = now(), is_primary = false
    where artifact_id = r.artifact_id and retired_at is null and not(id = any(published));

  update public.artifact_analysis_runs set status = 'complete', phase = 'complete', error = null,
    lease_token = null, lease_expires_at = null, updated_at = now() where id = r.id;
  perform public.artifact_analysis_sync_state(r.id);
  update public.artifacts set metadata = metadata || jsonb_build_object(
    'published_analysis_run_id',r.id,'framework_overview',p_overview,
    'analysis_finding_count',jsonb_array_length(p_findings),'enrichment_state','not_requested') where id = r.artifact_id;
  return true;
end $$;

-- Never give authenticated clients administrative queue/publish privileges.
revoke all on function public.artifact_analysis_sync_state(uuid) from public, anon, authenticated;
revoke all on function public.artifact_analysis_start(uuid,uuid,text,text,text,jsonb,boolean) from public, anon, authenticated;
revoke all on function public.artifact_analysis_claim(uuid) from public, anon, authenticated;
revoke all on function public.artifact_analysis_checkpoint(uuid,uuid,integer,jsonb) from public, anon, authenticated;
revoke all on function public.artifact_analysis_fail(uuid,uuid,text,boolean) from public, anon, authenticated;
revoke all on function public.artifact_analysis_publish(uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.artifact_analysis_sync_state(uuid), public.artifact_analysis_start(uuid,uuid,text,text,text,jsonb,boolean),
  public.artifact_analysis_claim(uuid), public.artifact_analysis_checkpoint(uuid,uuid,integer,jsonb),
  public.artifact_analysis_fail(uuid,uuid,text,boolean), public.artifact_analysis_publish(uuid,uuid,jsonb,jsonb) to service_role;

commit;
