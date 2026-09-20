-- A stale client or old worker must not delete findings and cascade into research.
-- Explicit deletion of the owning artifact still cascades normally.
begin;

create or replace function public.protect_artifact_claim_research()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.artifacts where id = old.artifact_id) then
    raise exception using
      errcode = '23514',
      message = 'Findings with an existing artifact must be retired, not deleted. Saved research was preserved.';
  end if;
  return old;
end;
$$;

revoke all on function public.protect_artifact_claim_research() from public, anon, authenticated;
create trigger protect_artifact_claim_research
before delete on public.artifact_claims
for each row execute function public.protect_artifact_claim_research();

commit;
