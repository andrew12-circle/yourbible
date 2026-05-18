alter function public.match_beliefs(vector, int) set search_path = public;
alter function public.match_journals(vector, int, uuid) set search_path = public;
alter function public.match_artifact_claims(vector, int) set search_path = public;
alter function public.match_entities(vector, int) set search_path = public;
alter function public.match_assistant_messages(vector, int, uuid) set search_path = public;