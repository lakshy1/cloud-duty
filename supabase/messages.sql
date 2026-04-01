create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;

create or replace function public.is_mutual_follow(user_one uuid, user_two uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.follows f1
    join public.follows f2
      on f1.follower_id = f2.following_id
     and f1.following_id = f2.follower_id
    where f1.follower_id = user_one
      and f1.following_id = user_two
  );
$$;

drop policy if exists "read own chats" on public.chats;
create policy "read own chats"
  on public.chats
  for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "insert mutual chats" on public.chats;
create policy "insert mutual chats"
  on public.chats
  for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and public.is_mutual_follow(user_a, user_b)
  );

drop policy if exists "delete own chats" on public.chats;
create policy "delete own chats"
  on public.chats
  for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "read chat messages" on public.chat_messages;
create policy "read chat messages"
  on public.chat_messages
  for select
  using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

drop policy if exists "insert chat messages" on public.chat_messages;
create policy "insert chat messages"
  on public.chat_messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chats c
      where c.id = chat_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

drop policy if exists "update own chat messages" on public.chat_messages;
create policy "update own chat messages"
  on public.chat_messages
  for update
  using (auth.uid() = sender_id);
