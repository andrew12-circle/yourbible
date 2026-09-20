-- Run after bootstrap and artifact migrations in the disposable test database.
do $$
declare
 aid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 uid uuid := '11111111-1111-1111-1111-111111111111';
 cid uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
 rid uuid; second_run uuid; job jsonb; old_job jsonb; source jsonb; batches jsonb; finding jsonb;
 text_hash text; transcript text; claim_text text := 'The speaker presents a personal example rather than a universal rule.';
begin
 perform test_assert((select count(*) = 1 from artifact_transcript_versions where schema_version = 0),'existing raw transcript is snapshotted');
 perform test_assert((select count(*) = 2 from artifact_finding_versions),'existing findings are snapshotted');
 perform test_assert(not has_function_privilege('authenticated','public.artifact_start_analysis(uuid,uuid,text,text,jsonb,jsonb,text,boolean)','EXECUTE'),'clients cannot mutate analysis jobs');
 perform test_assert(not has_function_privilege('anon','public.artifact_publish_analysis(uuid,uuid,jsonb,jsonb)','EXECUTE'),'anonymous publication is denied');
 begin
   delete from artifact_claims where id = cid;
   raise exception 'Direct deletion unexpectedly succeeded';
 exception when sqlstate '55000' then null;
 end;
 perform test_assert((select count(*) = 1 from artifact_claim_research_runs),'delete protection preserves research');
 source := jsonb_build_array(
   jsonb_build_object('id','segment-1','text',claim_text,'start_seconds',0,'end_seconds',10,'timing','measured'),
   jsonb_build_object('id','segment-2','text','Qualifications must remain attached to the teaching.','start_seconds',10,'end_seconds',null,'timing','measured')
 );
 batches := jsonb_build_array(
   jsonb_build_object('ordinal',0,'segments',jsonb_build_array(source->0)),
   jsonb_build_object('ordinal',1,'segments',jsonb_build_array(source->1))
 );
 select raw_text,encode(digest(raw_text,'sha256'),'hex') into transcript,text_hash from artifacts where id = aid;
 rid := artifact_start_analysis(aid,uid,'first',text_hash,source,batches,'test_captions',false);
 perform test_assert(artifact_start_analysis(aid,uid,'first',text_hash,source,batches,'test_captions',false) = rid,'enqueue is idempotent');
 perform test_assert((select count(*) = 2 from artifact_analysis_jobs where run_id = rid),'every planned batch is queued once');
 perform test_assert((select count(*) = 2 from artifact_claims where is_current),'previous findings stay visible while working');
 perform test_assert((select count(*) = 2 from artifact_transcript_segments where transcript_version_id is not null),'canonical transcript cache rebuilt');
 begin
   perform artifact_start_analysis(aid,'22222222-2222-2222-2222-222222222222','first',text_hash,source,batches,'paste',false);
   raise exception 'Wrong owner unexpectedly accepted';
 exception when sqlstate '40001' then null;
 end;
 begin
   perform artifact_start_analysis(aid,uid,'first','wrong-hash',source,batches,'paste',false);
   raise exception 'Stale source unexpectedly accepted';
 exception when sqlstate '40001' then null;
 end;
 finding := jsonb_build_object('key',lower(claim_text),'claim',claim_text,'finding_kind','qualification',
   'importance_score',14,'importance_reason','Preserves a central qualification.','doctrine_tags','[]'::jsonb,
   'source_evidence',jsonb_build_object('quote',claim_text,'quote_verified',true,'segment_ids',jsonb_build_array('segment-1'),
     'start_seconds',0,'end_seconds',10,'timing','measured'));
 job := artifact_claim_analysis_job(rid);
 perform test_assert(job->>'stage' = 'extract','first job is extraction');
 perform test_assert(artifact_complete_analysis_job((job->>'id')::uuid,(job->>'lease_token')::uuid,
   jsonb_build_object('summary','First section','findings',jsonb_build_array(finding))),'batch result persisted');
 perform test_assert((select status = 'analyzing' from artifacts where id = aid),'one section does not mean ready');
 perform test_assert(not exists(select 1 from artifact_analysis_jobs where run_id = rid and stage = 'consolidate'),'consolidation waits for all sections');
 job := artifact_claim_analysis_job(rid);
 perform test_assert(artifact_complete_analysis_job((job->>'id')::uuid,(job->>'lease_token')::uuid,
   '{"summary":"Second section has no additional finding","findings":[]}'::jsonb),'empty section is saved as completed');
 job := artifact_claim_analysis_job(rid);
 perform test_assert(job->>'stage' = 'consolidate','consolidation follows complete coverage');
 perform test_assert(artifact_publish_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,jsonb_build_array(finding),
   jsonb_build_object('summary','The source qualifies a teaching.','primary_keys',jsonb_build_array(lower(claim_text)),'findings_count',1)),'publication succeeds');
 perform test_assert((select status = 'ready' and metadata#>>'{analysis,status}' = 'complete' from artifacts where id = aid),'ready requires complete publication');
 perform test_assert((select verdict = 'hold' and user_note = 'Keep my research note' and is_current from artifact_claims where id = cid),'same claim ID preserves verdict and note');
 perform test_assert((select length(claim_key) = 64 from artifact_claims where id = cid),'finding identity is a bounded hash');
 perform test_assert((select metadata#>>'{findings_overview,primary_ids,0}' = cid::text from artifacts where id = aid),'overview links real compact finding IDs');
 perform test_assert((select count(*) = 1 from artifact_claims where not is_current),'unselected old finding archived, not deleted');
 perform test_assert((select count(*) = 1 from artifact_claim_research_runs),'research run survives publication');
 perform test_assert((select count(*) = 1 from claim_research_events),'research events survive publication');
 perform test_assert(not artifact_publish_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,jsonb_build_array(finding),'{}'),'duplicate publication cannot overwrite a finished run');

 update artifacts set processing_token = 'second',raw_text = raw_text || ' Additional source text.' where id = aid;
 select encode(digest(raw_text,'sha256'),'hex') into text_hash from artifacts where id = aid;
 second_run := artifact_start_analysis(aid,uid,'second',text_hash,source,batches,'test_captions',false);
 job := artifact_claim_analysis_job(second_run);
 perform artifact_complete_analysis_job((job->>'id')::uuid,(job->>'lease_token')::uuid,
   jsonb_build_object('summary','First section','findings',jsonb_build_array(finding)));
 job := artifact_claim_analysis_job(second_run);
 perform test_assert(artifact_fail_analysis_job((job->>'id')::uuid,(job->>'lease_token')::uuid,'provider_billing','Provider quota unavailable',false),'failure saved');
 perform test_assert((select status = 'partial' from artifact_analysis_runs where id = second_run),'late failure is partial, not complete');
 perform test_assert((select status = 'error' from artifacts where id = aid),'partial failure never appears ready');
 perform test_assert((select is_current and verdict = 'hold' from artifact_claims where id = cid),'failed re-analysis keeps published research');
 perform test_assert(artifact_start_analysis(aid,uid,'second',text_hash,source,batches,'test_captions',true) = second_run,'resume reuses checkpointed run');
 perform test_assert((select count(*) = 1 from artifact_analysis_jobs where run_id = second_run and status = 'done'),'resume keeps completed batches');
 old_job := artifact_claim_analysis_job(second_run);
 update artifact_analysis_jobs set lease_until = now() - interval '1 second' where id = (old_job->>'id')::uuid;
 job := artifact_claim_analysis_job(second_run);
 perform test_assert(job->>'id' = old_job->>'id' and job->>'lease_token' <> old_job->>'lease_token','expired worker lease is reclaimed');
 perform test_assert(not artifact_complete_analysis_job((old_job->>'id')::uuid,(old_job->>'lease_token')::uuid,'{}'),'stale worker cannot save');
 perform test_assert(not artifact_fail_analysis_job((old_job->>'id')::uuid,(old_job->>'lease_token')::uuid,'stale','stale',false),'stale worker cannot fail replacement');
 perform artifact_complete_analysis_job((job->>'id')::uuid,(job->>'lease_token')::uuid,'{"summary":"Finished section","findings":[]}');
 job := artifact_claim_analysis_job(second_run);
 begin
   perform artifact_publish_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,'[{"claim":"Invalid"}]','{}');
   raise exception 'Invalid publication unexpectedly succeeded';
 exception when raise_exception then
   if sqlerrm = 'Invalid publication unexpectedly succeeded' then raise; end if;
 end;
 perform test_assert((select is_current and user_note = 'Keep my research note' from artifact_claims where id = cid),'invalid publication rolls back archival');
 perform test_assert((select status = 'running' from artifact_analysis_runs where id = second_run),'invalid publication does not complete run');
 perform artifact_publish_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,jsonb_build_array(finding),
   jsonb_build_object('summary','New version','primary_keys',jsonb_build_array(lower(claim_text))));
 perform test_assert((select count(*) = 2 from artifact_finding_versions where claim_id = cid and run_id is not null),'both generated versions retained');
 perform test_assert((select needs_review from artifact_claims where id = cid),'changed evidence asks user to review saved verdict');

 insert into artifact_playback_progress(user_id,artifact_id,playback_seconds,updated_at) values(uid,aid,900,'2026-01-01T01:00:00Z');
 update artifact_playback_progress set playback_seconds = 20,updated_at = '2026-01-01T02:00:00Z' where artifact_id = aid;
 perform test_assert((select playback_seconds = 20 and furthest_seconds = 900 from artifact_playback_progress where artifact_id = aid),'rewind and watch coverage are separate');
 update artifact_playback_progress set playback_seconds = 800,updated_at = '2026-01-01T01:30:00Z' where artifact_id = aid;
 perform test_assert((select playback_seconds = 20 from artifact_playback_progress where artifact_id = aid),'older write cannot overwrite latest rewind');
end $$;

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test_assert((select count(*) = 0 from artifact_transcript_versions),'other user cannot read source snapshots');
select test_assert((select count(*) = 0 from artifact_analysis_runs),'other user cannot read analysis runs');
select test_assert((select count(*) = 0 from artifact_analysis_jobs),'other user cannot read analysis jobs');
select test_assert((select count(*) = 0 from artifact_finding_versions),'other user cannot read research snapshots');
reset role;

do $$
begin
 delete from artifacts where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 perform test_assert((select count(*) = 0 from artifact_claims),'intentional parent deletion still cascades');
 perform test_assert((select count(*) = 0 from artifact_claim_research_runs),'intentional artifact deletion removes its research');
 perform test_assert((select count(*) = 0 from artifact_transcript_versions),'intentional artifact deletion removes private transcript history');
end $$;
select 'Artifact migration, publication, recovery, and access checks passed' as result;
