revoke execute on function public.enqueue_embedding_job(uuid, text, uuid) from public, anon;
revoke execute on function public.trg_enqueue_belief_embedding()    from public, anon;
revoke execute on function public.trg_enqueue_journal_embedding()   from public, anon;
revoke execute on function public.trg_enqueue_claim_embedding()     from public, anon;
revoke execute on function public.trg_enqueue_entity_embedding()    from public, anon;
revoke execute on function public.trg_enqueue_ai_msg_embedding()    from public, anon;