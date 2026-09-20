\set ON_ERROR_STOP on
-- Isolated CI database only. This fixture is never applied to the application's database.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema extensions;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.artifacts(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
  title text, kind text, raw_text text not null default '', status text default 'ready', error text, metadata jsonb default '{}', processing_token text);
create table public.artifact_claims(id uuid primary key default gen_random_uuid(), artifact_id uuid references artifacts on delete cascade,
  user_id uuid references auth.users, claim text not null, verdict text, user_note text, created_at timestamptz default now(),
  doctrine_tags text[] default '{}', scripture_supports jsonb default '[]', scripture_challenges jsonb default '[]',
  chapter_start_seconds integer, matched_belief_id uuid, match_relation text, epistemology jsonb default '{}');
create table public.artifact_claim_research_runs(id uuid primary key default gen_random_uuid(), artifact_claim_id uuid references artifact_claims on delete cascade);
create table public.claim_research_events(id uuid primary key default gen_random_uuid(), artifact_claim_id uuid references artifact_claims on delete cascade);
create type public.transcript_segment_source as enum('caption','third_party','deepgram','gemini','paste');
create table public.artifact_transcript_segments(id uuid default gen_random_uuid(),artifact_id uuid,user_id uuid,seq integer,start_seconds integer,end_seconds integer,text text,source transcript_segment_source);
create table public.artifact_transcript_chunks(id uuid default gen_random_uuid(),artifact_id uuid,user_id uuid,start_seconds integer,end_seconds integer,text text,metadata jsonb);

\i supabase/migrations/20260920030000_artifact_analysis_integrity.sql
\i supabase/migrations/20260920030100_artifact_analysis_dispatcher.sql

create function public.assert_artifact(condition boolean, message text) returns void language plpgsql as $$
begin if condition is not true then raise exception 'ASSERTION FAILED: %',message; end if; end $$;

insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into artifacts(id,user_id,title,kind,raw_text,processing_token) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Test source','youtube','The speaker describes learning patience.','token-1');
insert into artifact_claims(id,user_id,artifact_id,claim,verdict,user_note) values
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','The speaker reports learning patience.','keep','Personal research must survive.'),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','An older interpretation.','reject','Keep this history too.');
insert into artifact_claim_research_runs(artifact_claim_id) select id from artifact_claims;
insert into claim_research_events(artifact_claim_id) select id from artifact_claims;

select public.artifact_analysis_start('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','token-1',
  'The speaker describes learning patience.','hash-1',
  '[{"index":0,"segments":[{"id":"transcript-0","text":"The speaker describes learning patience.","startSeconds":5,"endSeconds":10,"timing":"measured"}]}]') as run_id \gset
select assert_artifact((select count(*)=2 from artifact_claims),'starting re-analysis must not delete findings');
select assert_artifact((select count(*)=1 from artifact_transcript_segments),'canonical transcript is indexed before any model call');
select assert_artifact(:'run_id'::uuid = public.artifact_analysis_start('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','token-1','The speaker describes learning patience.','hash-1',
  '[{"index":0,"segments":[{"id":"transcript-0","text":"The speaker describes learning patience.","startSeconds":5,"endSeconds":10,"timing":"measured"}]}]'),'start must be idempotent');
select lease_token as lease from artifact_analysis_claim(:'run_id') \gset
select assert_artifact((select count(*)=0 from artifact_analysis_claim(:'run_id')),'duplicate workers must not claim an active lease');
select assert_artifact(not artifact_analysis_publish(:'run_id',:'lease','[]','{}'),'cannot publish before every section completes');
select artifact_analysis_checkpoint(:'run_id',:'lease',0,
 '[{"id":"b0c0","claim":"The speaker reports learning patience.","source_quote":"The speaker describes learning patience.","source_segment_ids":["transcript-0"],"source_start_seconds":5,"source_end_seconds":10,"source_timing_kind":"measured","importance_score":85,"importance_reason":"Central testimony.","doctrine_tags":["patience"],"scripture_supports":[]}]') as checkpoint \gset
select assert_artifact(:'checkpoint'::boolean,'checkpoint should save a valid section');
select assert_artifact(not artifact_analysis_checkpoint(:'run_id',:'lease',0,'[]'),'replayed checkpoint must not append candidates twice');
select assert_artifact((select next_batch=1 and phase='rank' and jsonb_array_length(candidates)=1 from artifact_analysis_runs where id=:'run_id'),'persisted coverage is exact');
select lease_token as lease from artifact_analysis_claim(:'run_id') \gset

do $$ declare r artifact_analysis_runs; failed boolean:=false; valid jsonb;
begin
 select * into r from artifact_analysis_runs where processing_token='token-1';
 valid := r.candidates->0 || '{"is_primary":true,"matched_belief_id":null,"match_relation":"new","epistemology":{}}';
 begin
   perform artifact_analysis_publish(r.id,r.lease_token,jsonb_build_array(valid,'{"id":"invented","claim":"Fabricated"}'::jsonb),'{}');
 exception when others then failed:=true; end;
 perform assert_artifact(failed,'fabricated candidate must fail publication');
 perform assert_artifact((select analysis_run_id is null from artifact_claims where id='20000000-0000-0000-0000-000000000001'),'failed publish must rollback prior updates');
end $$;
select artifact_analysis_publish(:'run_id',:'lease',
 '[{"id":"b0c0","claim":"The speaker reports learning patience.","source_quote":"The speaker describes learning patience.","source_segment_ids":["transcript-0"],"source_start_seconds":5,"source_end_seconds":10,"source_timing_kind":"measured","importance_score":95,"importance_reason":"Central testimony.","doctrine_tags":["patience"],"scripture_supports":[],"is_primary":true,"matched_belief_id":null,"match_relation":"new","epistemology":{}}]',
 '{"summary":"The speaker describes learning patience.","key_points":["A personal testimony."]}') as published \gset
select assert_artifact(:'published'::boolean,'valid publication should succeed');
select assert_artifact((select count(*)=2 from artifact_claim_research_runs),'research runs survive publication');
select assert_artifact((select count(*)=2 from claim_research_events),'research events survive publication');
select assert_artifact((select verdict='keep' and user_note='Personal research must survive.' and retired_at is null from artifact_claims where id='20000000-0000-0000-0000-000000000001'),'exact statement retains identity, verdict and notes');
select assert_artifact((select retired_at is not null and verdict='reject' from artifact_claims where id='20000000-0000-0000-0000-000000000002'),'replaced finding is archived, not deleted');
select assert_artifact(not artifact_analysis_publish(:'run_id',:'lease','[]','{}'),'completed run cannot publish again');

update artifacts set raw_text='The corrected source now describes patience.',processing_token='token-2' where id='10000000-0000-0000-0000-000000000001';
select assert_artifact((select count(*)=1 from artifact_transcript_revisions),'old transcript must be archived');
select assert_artifact((select count(*)=0 from artifact_transcript_chunks),'old search chunks must not survive a source replacement');
select artifact_analysis_start('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','token-2',
 'The corrected source now describes patience.','hash-2',
 '[{"index":0,"segments":[{"id":"transcript-0","text":"The corrected source now describes patience.","startSeconds":null,"endSeconds":null,"timing":"unavailable"}]}]') as second_id \gset
select lease_token as lease2 from artifact_analysis_claim(:'second_id') \gset
select artifact_analysis_fail(:'second_id',:'lease2','Provider quota unavailable',false);
select assert_artifact((select status='partial' and next_batch=0 from artifact_analysis_runs where id=:'second_id'),'quota failure is incomplete, not ready');
select assert_artifact((select status='error' and metadata->'analysis_v2'->>'state'='partial' from artifacts where id='10000000-0000-0000-0000-000000000001'),'UI state must disclose incomplete work');
select assert_artifact((select count(*)=2 from artifact_claim_research_runs),'failed rerun preserves all research');

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select assert_artifact((select count(*)=0 from artifact_analysis_runs),'cross-account run reads are denied');
do $$ declare denied boolean:=false;
begin
 begin perform public.artifact_analysis_claim(null); exception when insufficient_privilege then denied:=true; end;
 perform public.assert_artifact(denied,'authenticated users cannot acquire service leases');
end $$;
reset role;
select 'Artifact migration invariants passed.' as result;
