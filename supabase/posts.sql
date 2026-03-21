create extension if not exists "pgcrypto";

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  impressions_count integer not null default 0,
  img text not null,
  ava text not null,
  author text not null,
  handle text not null,
  tag text not null,
  title text not null,
  summary text not null,
  "desc" text not null,
  views text not null,
  likes text not null,
  comments text not null,
  shares text not null
);

alter table public.posts enable row level security;
alter table public.posts add column if not exists impressions_count integer not null default 0;
alter table public.posts add column if not exists likes_count integer not null default 0;
alter table public.posts add column if not exists dislikes_count integer not null default 0;
alter table public.posts add column if not exists slug text;
alter table public.posts add column if not exists summary text;
alter table public.posts add column if not exists user_id uuid references auth.users(id) on delete set null;

drop index if exists posts_unique_slug;
drop policy if exists "public read posts" on public.posts;
create policy "public read posts"
  on public.posts
  for select
  using (true);

drop policy if exists "public insert posts" on public.posts;
create policy "public insert posts"
  on public.posts
  for insert
  with check (true);

drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts"
  on public.posts
  for delete
  using (auth.uid() = user_id);

create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  unique (user_id, post_id)
);

alter table public.saved_posts enable row level security;
drop policy if exists "read own saved posts" on public.saved_posts;
create policy "read own saved posts"
  on public.saved_posts
  for select
  using (auth.uid() = user_id);
drop policy if exists "insert own saved posts" on public.saved_posts;
create policy "insert own saved posts"
  on public.saved_posts
  for insert
  with check (auth.uid() = user_id);
drop policy if exists "delete own saved posts" on public.saved_posts;
create policy "delete own saved posts"
  on public.saved_posts
  for delete
  using (auth.uid() = user_id);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  unique (user_id, post_id)
);

alter table public.post_reactions enable row level security;

drop policy if exists "read own reactions" on public.post_reactions;
create policy "read own reactions"
  on public.post_reactions
  for select
  using (auth.uid() = user_id);

drop policy if exists "insert own reactions" on public.post_reactions;
create policy "insert own reactions"
  on public.post_reactions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own reactions" on public.post_reactions;
create policy "update own reactions"
  on public.post_reactions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own reactions" on public.post_reactions;
create policy "delete own reactions"
  on public.post_reactions
  for delete
  using (auth.uid() = user_id);

drop function if exists public.log_reaction(uuid, text);
create function public.log_reaction(p_post_id uuid, p_reaction text)
returns table (likes integer, dislikes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing text;
begin
  if v_user is null then
    return;
  end if;
  if p_reaction not in ('like','dislike') then
    return;
  end if;

  select reaction into v_existing
  from public.post_reactions
  where user_id = v_user and post_id = p_post_id;

  if v_existing = p_reaction then
    delete from public.post_reactions
      where user_id = v_user and post_id = p_post_id;
    if p_reaction = 'like' then
      update public.posts
        set likes_count = greatest(coalesce(likes_count, 0) - 1, 0)
        where id = p_post_id;
    else
      update public.posts
        set dislikes_count = greatest(coalesce(dislikes_count, 0) - 1, 0)
        where id = p_post_id;
    end if;
  else
    if v_existing is null then
      insert into public.post_reactions (user_id, post_id, reaction)
      values (v_user, p_post_id, p_reaction);
      if p_reaction = 'like' then
        update public.posts
          set likes_count = coalesce(likes_count, 0) + 1
          where id = p_post_id;
      else
        update public.posts
          set dislikes_count = coalesce(dislikes_count, 0) + 1
          where id = p_post_id;
      end if;
    else
      update public.post_reactions
        set reaction = p_reaction
        where user_id = v_user and post_id = p_post_id;
      if p_reaction = 'like' then
        update public.posts
          set likes_count = coalesce(likes_count, 0) + 1,
              dislikes_count = greatest(coalesce(dislikes_count, 0) - 1, 0)
          where id = p_post_id;
      else
        update public.posts
          set dislikes_count = coalesce(dislikes_count, 0) + 1,
              likes_count = greatest(coalesce(likes_count, 0) - 1, 0)
          where id = p_post_id;
      end if;
    end if;
  end if;

  return query
    select likes_count, dislikes_count
    from public.posts
    where id = p_post_id;
end;
$$;

grant execute on function public.log_reaction(uuid, text) to authenticated;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  cover_url text
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists cover_url text;

-- Retroactively update post identity from profiles
-- Requires public.posts.user_id to exist and match profiles.user_id
update public.posts p
set
  author = coalesce(pr.full_name, p.author),
  handle = coalesce(
    case
      when pr.username is not null and pr.username <> '' then '@' || pr.username
      else null
    end,
    p.handle
  ),
  ava = coalesce(pr.avatar_url, p.ava)
from public.profiles pr
where p.user_id = pr.user_id;

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "public read profiles for search" on public.profiles;
create policy "public read profiles for search"
  on public.profiles
  for select
  using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.post_impressions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  unique (user_id, post_id)
);

alter table public.post_impressions enable row level security;

drop policy if exists "read own impressions" on public.post_impressions;
create policy "read own impressions"
  on public.post_impressions
  for select
  using (auth.uid() = user_id);

drop policy if exists "insert own impressions" on public.post_impressions;
create policy "insert own impressions"
  on public.post_impressions
  for insert
  with check (auth.uid() = user_id);

drop function if exists public.log_impression(uuid);
create function public.log_impression(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    return null;
  end if;

  if not exists (
    select 1 from public.post_impressions
    where user_id = v_user and post_id = p_post_id
  ) then
    insert into public.post_impressions (user_id, post_id)
    values (v_user, p_post_id);
  end if;

  select count(*) into v_count
  from public.post_impressions
  where post_id = p_post_id;

  update public.posts
    set impressions_count = v_count
    where id = p_post_id;

  return v_count;
end;
$$;

grant execute on function public.log_impression(uuid) to authenticated;

delete from public.posts;

insert into public.posts (img, ava, author, handle, tag, title, summary, slug, "desc", views, likes, comments, shares) values
(
  $$https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85$$,
  $$/cloud-avatar.svg$$,
  $$CloudDuty$$,
  $$@CloudDuty$$,
  $$Announcement$$,
  $$Welcome to CloudDuty$$,
  $$CloudDuty is a platform for developers to showcase there projects and make a attractive portfolio to showcase to other people, they can also connect and interact with other developers !$$,
  $$welcome-to-cloudduty$$,
  $$CloudDuty is a platform for developers to showcase there projects and make a attractive portfolio to showcase to other people, they can also connect and interact with other developers !$$,
  $$0$$,
  $$0$$,
  $$0$$,
  $$0$$
);

update public.posts
set slug = lower(regexp_replace(regexp_replace(title || '-' || replace(handle, '@', ''), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null;

delete from public.posts a
using public.posts b
where a.id > b.id
  and a.slug = b.slug;

create unique index posts_unique_slug
  on public.posts (slug);

update public.posts
  set impressions_count = coalesce(impressions_count, 0),
      likes_count = coalesce(likes_count, 0),
      dislikes_count = coalesce(dislikes_count, 0),
      views = coalesce(views, '0'),
      likes = coalesce(likes, '0'),
      comments = coalesce(comments, '0'),
      shares = coalesce(shares, '0');
