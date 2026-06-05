-- Profile image URL for person entities (Wikipedia / DuckDuckGo / enrichment pipeline).
alter table public.knowledge_entities
  add column if not exists avatar_url text;

comment on column public.knowledge_entities.avatar_url is
  'Remote avatar URL for person entities from public enrichment (not cached in Storage yet).';
