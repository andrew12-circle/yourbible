\set ON_ERROR_STOP on
-- Run only in the isolated fixture database after test-artifact-migration.sql.
\i supabase/migrations/20260920030500_artifact_research_delete_guard.sql

begin;
do $$
declare blocked boolean := false; research_before bigint; events_before bigint;
begin
  select count(*) into research_before from public.artifact_claim_research_runs;
  select count(*) into events_before from public.claim_research_events;
  perform public.assert_artifact(research_before > 0 and events_before > 0, 'guard test requires saved research');
  begin
    delete from public.artifact_claims
    where artifact_id = '10000000-0000-0000-0000-000000000001';
  exception when check_violation then blocked := true;
  end;
  perform public.assert_artifact(blocked, 'legacy delete-and-rebuild must be rejected');
  perform public.assert_artifact((select count(*) = research_before from public.artifact_claim_research_runs), 'blocked deletion preserves research runs');
  perform public.assert_artifact((select count(*) = events_before from public.claim_research_events), 'blocked deletion preserves research events');
  perform public.assert_artifact((select user_note = 'Personal research must survive.' from public.artifact_claims where id = '20000000-0000-0000-0000-000000000001'), 'blocked deletion preserves personal notes');
  update public.artifact_claims set retired_at = now()
    where id = '20000000-0000-0000-0000-000000000001';
  perform public.assert_artifact((select count(*) = research_before from public.artifact_claim_research_runs), 'retiring a finding preserves historical research');
  delete from public.artifacts where id = '10000000-0000-0000-0000-000000000001';
  perform public.assert_artifact(not exists(select 1 from public.artifact_claims where artifact_id = '10000000-0000-0000-0000-000000000001'), 'intentional artifact deletion still cascades');
  perform public.assert_artifact((select count(*) = 0 from public.artifact_claim_research_runs), 'intentional artifact deletion removes owned research');
end $$;
rollback;
select 'Artifact research deletion guard passed.' as result;
