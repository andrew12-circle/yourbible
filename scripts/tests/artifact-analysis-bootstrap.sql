-- Test-only fixture. Run in an empty disposable PostgreSQL database, never in production.
create extension if not exists pgcrypto;
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to authenticated,service_role;
create table public.artifacts (
 id uuid primary key, user_id uuid not null references auth.users on delete cascade, title text,
 kind text default 'youtube', raw_text text, status text default 'ready', error text, processing_token text,
 metadata jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.artifact_claims (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 artifact_id uuid not null references artifacts on delete cascade,claim text not null,tone text,
 doctrine_tags text[] default '{}',scripture_supports jsonb default '[]',scripture_challenges jsonb default '[]',
 matched_belief_id uuid,match_relation text,bias_flags text[] default '{}',verdict text,user_note text,
 created_at timestamptz default now(),chapter_start_seconds integer,embedding text,deferred_at timestamptz,epistemology jsonb default '{}'
);
create type public.transcript_segment_source as enum ('caption','third_party','deepgram','gemini','paste');
create table public.artifact_transcript_segments (
 id uuid primary key default gen_random_uuid(),artifact_id uuid references artifacts on delete cascade,
 user_id uuid references auth.users on delete cascade,seq integer,start_seconds integer not null default 0,end_seconds integer,
 text text not null,speaker text,confidence real,source transcript_segment_source default 'caption',created_at timestamptz default now()
);
create table public.artifact_transcript_chunks (
 id uuid primary key default gen_random_uuid(),artifact_id uuid references artifacts on delete cascade,
 user_id uuid references auth.users on delete cascade,start_seconds integer not null default 0,end_seconds integer,text text not null,
 embedding text,metadata jsonb default '{}',created_at timestamptz default now()
);
create table public.artifact_playback_progress (
 user_id uuid references auth.users on delete cascade,artifact_id uuid references artifacts on delete cascade,
 playback_seconds integer not null,updated_at timestamptz not null default now(),primary key(user_id,artifact_id)
);
create table public.artifact_claim_research_runs (
 id uuid primary key default gen_random_uuid(),artifact_claim_id uuid references artifact_claims on delete cascade,
 artifact_id uuid references artifacts on delete cascade,user_id uuid references auth.users on delete cascade,
 brief_summary text,pack_json jsonb,created_at timestamptz default now()
);
create table public.claim_research_events (
 id uuid primary key default gen_random_uuid(),artifact_claim_id uuid references artifact_claims on delete cascade
);
insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
insert into artifacts(id,user_id,title,raw_text,processing_token) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','Test source',
 '[0:00] The speaker presents a personal example rather than a universal rule.\n[0:10] Qualifications must remain attached to the teaching.','first');
insert into artifact_claims(id,user_id,artifact_id,claim,verdict,user_note) values
 ('cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'The speaker presents a personal example rather than a universal rule.','hold','Keep my research note'),
 ('dddddddd-dddd-dddd-dddd-dddddddddddd','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'An incidental introduction was previously extracted.',null,null);
insert into artifact_claim_research_runs(artifact_claim_id,artifact_id,user_id,brief_summary,pack_json) values
 ('cccccccc-cccc-cccc-cccc-cccccccccccc','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','Saved research','{"saved":true}');
insert into claim_research_events(artifact_claim_id) values ('cccccccc-cccc-cccc-cccc-cccccccccccc');
create function public.test_assert(condition boolean,message text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if; end $$;
