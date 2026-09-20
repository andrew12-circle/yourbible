-- Hash identities avoid oversized indexes for multilingual claims. Expose compact primary IDs to the UI.
create or replace function public.artifact_publish_analysis(
  p_job_id uuid,p_lease_token uuid,p_findings jsonb,p_summary jsonb
) returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare j public.artifact_analysis_jobs; r public.artifact_analysis_runs; a public.artifacts;
  v public.artifact_transcript_versions; f jsonb; cid uuid; k text; normalized text; ev jsonb; overview jsonb;
begin
  select * into j from public.artifact_analysis_jobs where id = p_job_id;
  if not found or j.stage <> 'consolidate' then return false; end if;
  select * into r from public.artifact_analysis_runs where id = j.run_id;
  perform pg_advisory_xact_lock(hashtextextended(r.artifact_id::text,0));
  select * into a from public.artifacts where id = r.artifact_id for update;
  select * into v from public.artifact_transcript_versions where id = r.transcript_version_id;
  if not found or a.id is null or a.processing_token is distinct from r.processing_token or r.status <> 'running'
    or encode(digest(coalesce(a.raw_text,''),'sha256'),'hex') <> v.content_hash then return false; end if;
  if not exists(select 1 from public.artifact_analysis_jobs where id = j.id and status = 'running'
      and lease_token = p_lease_token and lease_until > now()) then return false; end if;
  if exists(select 1 from public.artifact_analysis_jobs where run_id = r.id and stage = 'extract' and status <> 'done') then
    raise exception 'Cannot publish incomplete analysis'; end if;
  if jsonb_typeof(p_findings) is distinct from 'array' or jsonb_array_length(p_findings) > 12000 then raise exception 'Invalid findings'; end if;
  update public.artifact_claims set is_current = false where artifact_id = a.id;
  for f in select value from jsonb_array_elements(p_findings) loop
    if length(trim(coalesce(f->>'claim',''))) < 15 or length(trim(coalesce(f#>>'{source_evidence,quote}',''))) < 12 then
      raise exception 'Finding has no source evidence'; end if;
    normalized := lower(regexp_replace(trim(f->>'claim'),'\s+',' ','g'));
    k := encode(digest(normalized,'sha256'),'hex');
    ev := (f->'source_evidence') || jsonb_build_object('transcript_version_id',v.id,'content_hash',v.content_hash);
    select id into cid from public.artifact_claims where artifact_id = a.id
      and (claim_key = k or (claim_key is null and lower(regexp_replace(trim(claim),'\s+',' ','g')) = normalized))
      order by (verdict is not null) desc,created_at,id limit 1;
    if found then
      update public.artifact_claims set is_current = true,analysis_run_id = r.id,claim_key = k,
        needs_review = needs_review or (verdict is not null and source_evidence is distinct from ev),
        source_evidence = ev,importance_score = (f->>'importance_score')::real,
        importance_reason = f->>'importance_reason',finding_kind = f->>'finding_kind'
      where id = cid;
    else
      insert into public.artifact_claims(user_id,artifact_id,claim,claim_key,is_current,analysis_run_id,
        source_evidence,importance_score,importance_reason,finding_kind,doctrine_tags,
        scripture_supports,scripture_challenges,bias_flags,epistemology,match_relation,chapter_start_seconds)
      values(a.user_id,a.id,f->>'claim',k,true,r.id,ev,(f->>'importance_score')::real,
        f->>'importance_reason',f->>'finding_kind',array(select jsonb_array_elements_text(coalesce(f->'doctrine_tags','[]'))),
        '[]','[]','{}','{}',null,null) returning id into cid;
    end if;
    insert into public.artifact_finding_versions(run_id,artifact_id,user_id,claim_id,payload)
    values(r.id,a.id,a.user_id,cid,f || jsonb_build_object('source_evidence',ev));
  end loop;
  select (p_summary - 'primary_keys') || jsonb_build_object('primary_ids',coalesce(jsonb_agg(c.id order by selected.ordinality),'[]'))
    into overview
  from jsonb_array_elements_text(coalesce(p_summary->'primary_keys','[]')) with ordinality selected(key,ordinality)
  join public.artifact_claims c on c.artifact_id = a.id and c.is_current
    and c.claim_key = encode(digest(selected.key,'sha256'),'hex');
  update public.artifact_analysis_jobs set status = 'done',result = overview,lease_until = null where id = j.id;
  update public.artifact_analysis_runs set status = 'complete',summary = overview,error = null,error_code = null,
    updated_at = now(),published_at = now() where id = r.id;
  update public.artifacts set metadata = (coalesce(metadata,'{}') - 'framework_overview') || jsonb_build_object('findings_overview',overview)
    where id = a.id and processing_token = r.processing_token;
  perform public.artifact_analysis_progress(r.id);
  return true;
end $$;
revoke all on function public.artifact_publish_analysis(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.artifact_publish_analysis(uuid,uuid,jsonb,jsonb) to service_role;

alter table public.artifact_playback_progress add column if not exists furthest_seconds integer not null default 0;
update public.artifact_playback_progress set furthest_seconds = greatest(furthest_seconds,playback_seconds);
create or replace function public.artifact_playback_latest_intent() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then return old; end if;
    new.furthest_seconds := greatest(old.furthest_seconds,old.playback_seconds,new.playback_seconds);
  else
    new.furthest_seconds := greatest(0,new.playback_seconds);
  end if;
  return new;
end $$;
create trigger artifact_playback_latest_intent before insert or update on public.artifact_playback_progress
for each row execute function public.artifact_playback_latest_intent();
