-- Run this in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  language_preference text not null default 'zh' check (language_preference in ('zh', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wiki_page_id text not null,
  title text not null,
  article_url text,
  language text not null check (language in ('zh', 'en')),
  bucket text not null check (bucket in ('known', 'curious', 'not_interested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, wiki_page_id)
);

create index if not exists feed_votes_user_id_idx on public.feed_votes(user_id);
create index if not exists feed_votes_bucket_idx on public.feed_votes(bucket);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_feed_votes_updated_at on public.feed_votes;
create trigger touch_feed_votes_updated_at
before update on public.feed_votes
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.feed_votes enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Votes are viewable by owner" on public.feed_votes;
create policy "Votes are viewable by owner"
on public.feed_votes
for select
using (auth.uid() = user_id);

drop policy if exists "Votes are insertable by owner" on public.feed_votes;
create policy "Votes are insertable by owner"
on public.feed_votes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Votes are updatable by owner" on public.feed_votes;
create policy "Votes are updatable by owner"
on public.feed_votes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Votes are deletable by owner" on public.feed_votes;
create policy "Votes are deletable by owner"
on public.feed_votes
for delete
using (auth.uid() = user_id);
