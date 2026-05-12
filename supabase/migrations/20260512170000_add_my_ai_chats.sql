-- Persistent "My AI" chats and messages (user-scoped, RLS).

create table if not exists public.my_ai_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.my_ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null references public.my_ai_chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists my_ai_messages_chat_idx on public.my_ai_messages (chat_id, created_at);
create index if not exists my_ai_chats_user_updated_idx on public.my_ai_chats (user_id, updated_at desc);

drop trigger if exists update_my_ai_chats_updated_at on public.my_ai_chats;
create trigger update_my_ai_chats_updated_at
  before update on public.my_ai_chats
  for each row execute function public.update_updated_at_column();

-- Bump parent chat when a message is inserted (list ordering without app round-trips).
create or replace function public.touch_my_ai_chat_from_message()
returns trigger
language plpgsql
as $$
begin
  update public.my_ai_chats set updated_at = now() where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists my_ai_messages_touch_chat on public.my_ai_messages;
create trigger my_ai_messages_touch_chat
  after insert on public.my_ai_messages
  for each row execute function public.touch_my_ai_chat_from_message();

alter table public.my_ai_chats enable row level security;
alter table public.my_ai_messages enable row level security;

create policy "my_ai_chats_select_own" on public.my_ai_chats for select to authenticated using (user_id = auth.uid());
create policy "my_ai_chats_insert_own" on public.my_ai_chats for insert to authenticated with check (user_id = auth.uid());
create policy "my_ai_chats_update_own" on public.my_ai_chats for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "my_ai_chats_delete_own" on public.my_ai_chats for delete to authenticated using (user_id = auth.uid());

create policy "my_ai_messages_select_own" on public.my_ai_messages for select to authenticated using (user_id = auth.uid());
create policy "my_ai_messages_insert_own" on public.my_ai_messages for insert to authenticated with check (user_id = auth.uid());
create policy "my_ai_messages_update_own" on public.my_ai_messages for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "my_ai_messages_delete_own" on public.my_ai_messages for delete to authenticated using (user_id = auth.uid());
