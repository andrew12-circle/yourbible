create table public.my_ai_message_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  chat_id uuid not null references public.my_ai_chats(id) on delete cascade,
  winning_message_id uuid references public.my_ai_messages(id) on delete set null,
  candidate_index int not null,
  temperature numeric not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  total_score numeric,
  was_winner boolean not null default false,
  judge_rationale text,
  created_at timestamp with time zone not null default now()
);

create index idx_my_ai_message_candidates_chat on public.my_ai_message_candidates(chat_id, created_at desc);
create index idx_my_ai_message_candidates_user on public.my_ai_message_candidates(user_id, created_at desc);

alter table public.my_ai_message_candidates enable row level security;

create policy "Users view own candidates"
on public.my_ai_message_candidates for select
using (auth.uid() = user_id);

create policy "Users insert own candidates"
on public.my_ai_message_candidates for insert
with check (auth.uid() = user_id);