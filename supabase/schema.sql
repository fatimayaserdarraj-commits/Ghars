-- MPS Garden — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once.

-- ---------------------------------------------------------------- per-user data (sync)
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;

drop policy if exists "user_data: read own"   on public.user_data;
drop policy if exists "user_data: insert own" on public.user_data;
drop policy if exists "user_data: update own" on public.user_data;
drop policy if exists "user_data: delete own" on public.user_data;
create policy "user_data: read own"   on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data: insert own" on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_data: update own" on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_data: delete own" on public.user_data for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- community
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  type        text not null check (type in ('question', 'showcase', 'tip')),
  text        text not null check (char_length(text) between 1 and 2000),
  image_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  text        text not null check (char_length(text) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (post_id, user_id)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists comments_post_id_idx on public.comments (post_id);

alter table public.posts      enable row level security;
alter table public.comments   enable row level security;
alter table public.post_likes enable row level security;

-- Everyone (including guests) can read; only signed-in users can write, and only as themselves.
drop policy if exists "posts: read"        on public.posts;
drop policy if exists "posts: insert own"  on public.posts;
drop policy if exists "posts: delete own"  on public.posts;
create policy "posts: read"       on public.posts for select to anon, authenticated using (true);
create policy "posts: insert own" on public.posts for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "posts: delete own" on public.posts for delete to authenticated using ((select auth.uid()) = author_id);

drop policy if exists "comments: read"       on public.comments;
drop policy if exists "comments: insert own" on public.comments;
drop policy if exists "comments: delete own" on public.comments;
create policy "comments: read"       on public.comments for select to anon, authenticated using (true);
create policy "comments: insert own" on public.comments for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "comments: delete own" on public.comments for delete to authenticated using ((select auth.uid()) = author_id);

drop policy if exists "likes: read"       on public.post_likes;
drop policy if exists "likes: insert own" on public.post_likes;
drop policy if exists "likes: delete own" on public.post_likes;
create policy "likes: read"       on public.post_likes for select to anon, authenticated using (true);
create policy "likes: insert own" on public.post_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "likes: delete own" on public.post_likes for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- photo storage
-- Public bucket: anyone can view photos; users can only upload into their own folder ({user id}/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos: upload own folder" on storage.objects;
drop policy if exists "photos: delete own"        on storage.objects;
create policy "photos: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------- welcome posts (optional)
-- Shown once the first user exists; remove this block if you don't want sample posts.
insert into public.posts (author_id, author_name, type, text)
select id, 'MPS Team', 'tip',
       'Welcome to the MPS community! 🌿 Share your plants, ask questions and help fellow gardeners.'
from auth.users
where not exists (select 1 from public.posts)
order by created_at
limit 1;
