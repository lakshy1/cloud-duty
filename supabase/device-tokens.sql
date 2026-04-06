create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;

drop policy if exists "manage own device tokens" on public.device_tokens;
create policy "manage own device tokens"
  on public.device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allows an authenticated user to look up device tokens for any user.
-- Used by /api/send-push to fetch recipient tokens without needing the service role key.
-- SECURITY DEFINER bypasses RLS; the grant restricts callers to authenticated users only.
drop function if exists public.get_push_tokens(uuid);
create function public.get_push_tokens(target_user_id uuid)
returns table(token text, platform text)
language sql
security definer
stable
as $$
  select token, platform from public.device_tokens where user_id = target_user_id;
$$;

revoke all on function public.get_push_tokens(uuid) from public;
grant execute on function public.get_push_tokens(uuid) to authenticated;

-- Keep updated_at current on upsert
create or replace function public.touch_device_token_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists device_tokens_updated_at on public.device_tokens;
create trigger device_tokens_updated_at
  before update on public.device_tokens
  for each row execute function public.touch_device_token_updated_at();
