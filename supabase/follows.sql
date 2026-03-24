create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table public.follows enable row level security;

drop policy if exists "public read follows" on public.follows;
create policy "public read follows"
  on public.follows
  for select
  using (true);

drop policy if exists "insert own follows" on public.follows;
create policy "insert own follows"
  on public.follows
  for insert
  with check (auth.uid() = follower_id);

drop policy if exists "delete own follows" on public.follows;
create policy "delete own follows"
  on public.follows
  for delete
  using (auth.uid() = follower_id);
