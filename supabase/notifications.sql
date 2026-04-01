create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  entity_id uuid,
  entity_type text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "insert actor notifications" on public.notifications;
create policy "insert actor notifications"
  on public.notifications
  for insert
  with check (auth.uid() = actor_id);

drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);

drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications"
  on public.notifications
  for delete
  using (auth.uid() = user_id);
