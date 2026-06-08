-- Cross-artifact corpus standing: compare one artifact's claims against the user's library.

create or replace function public.match_corpus_peers_for_artifact(
  p_artifact_id uuid,
  min_similarity float default 0.72,
  match_count int default 12
)
returns table (
  peer_artifact_id uuid,
  avg_similarity float,
  strong_match_count bigint,
  compared_claim_count bigint,
  top_source_claim text,
  top_peer_claim text,
  top_similarity float
)
language sql
stable
security invoker
set search_path = public
as $$
  with owned as (
    select 1
    from public.artifacts a
    where a.id = p_artifact_id
      and a.user_id = auth.uid()
  ),
  source as (
    select c.id, c.claim, c.embedding
    from public.artifact_claims c
    where c.artifact_id = p_artifact_id
      and c.user_id = auth.uid()
      and c.embedding is not null
  ),
  peers as (
    select c.id, c.artifact_id, c.claim, c.embedding
    from public.artifact_claims c
    where c.user_id = auth.uid()
      and c.artifact_id <> p_artifact_id
      and c.embedding is not null
  ),
  pairs as (
    select
      s.id as source_claim_id,
      s.claim as source_claim,
      p.artifact_id as peer_artifact_id,
      p.claim as peer_claim,
      1 - (s.embedding <=> p.embedding) as similarity
    from source s
    cross join peers p
  ),
  best_per_pair as (
    select distinct on (source_claim_id, peer_artifact_id)
      source_claim_id,
      source_claim,
      peer_artifact_id,
      peer_claim,
      similarity
    from pairs
    order by source_claim_id, peer_artifact_id, similarity desc
  ),
  peer_agg as (
    select
      b.peer_artifact_id,
      avg(b.similarity)::float as avg_similarity,
      count(*) filter (where b.similarity >= min_similarity) as strong_match_count,
      count(*) as compared_claim_count
    from best_per_pair b
    group by b.peer_artifact_id
  ),
  top_pair as (
    select distinct on (b.peer_artifact_id)
      b.peer_artifact_id,
      b.source_claim as top_source_claim,
      b.peer_claim as top_peer_claim,
      b.similarity::float as top_similarity
    from best_per_pair b
    order by b.peer_artifact_id, b.similarity desc
  )
  select
    p.peer_artifact_id,
    p.avg_similarity,
    p.strong_match_count,
    p.compared_claim_count,
    t.top_source_claim,
    t.top_peer_claim,
    t.top_similarity
  from peer_agg p
  join top_pair t on t.peer_artifact_id = p.peer_artifact_id
  where exists (select 1 from owned)
  order by p.avg_similarity desc, p.strong_match_count desc
  limit greatest(1, match_count);
$$;

create or replace function public.get_library_corpus_stats()
returns table (
  artifact_id uuid,
  title text,
  kind text,
  created_at timestamptz,
  claim_count bigint,
  agree_count bigint,
  disagree_count bigint,
  new_count bigint,
  peer_library_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with ready_peers as (
    select count(*)::bigint as n
    from public.artifacts a
    where a.user_id = auth.uid()
      and a.status = 'ready'
  )
  select
    a.id as artifact_id,
    a.title,
    a.kind,
    a.created_at,
    count(c.id) as claim_count,
    count(c.id) filter (where c.match_relation = 'agree') as agree_count,
    count(c.id) filter (where c.match_relation = 'disagree') as disagree_count,
    count(c.id) filter (
      where c.match_relation is null or c.match_relation = 'new'
    ) as new_count,
    greatest(0, (select n from ready_peers) - 1) as peer_library_count
  from public.artifacts a
  left join public.artifact_claims c
    on c.artifact_id = a.id and c.user_id = auth.uid()
  where a.user_id = auth.uid()
    and a.status = 'ready'
  group by a.id, a.title, a.kind, a.created_at
  order by a.created_at desc;
$$;

grant execute on function public.match_corpus_peers_for_artifact(uuid, float, int) to authenticated;
grant execute on function public.get_library_corpus_stats() to authenticated;
