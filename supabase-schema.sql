-- VRdict / CineLog — Supabase Schema
-- Run this in the Supabase SQL Editor

-- 1. Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Entries (library — watched movies and TV shows)
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  year text,
  genres text[] default '{}',
  poster text,
  overview text,
  tmdb_rating numeric(3,1),
  runtime integer,
  seasons integer default 0,
  episodes integer default 0,
  imdb_id text,
  my_rating numeric(3,1) not null check (my_rating >= 1 and my_rating <= 10),
  tags text[] default '{}',
  recommended boolean default false,
  rewatch boolean default false,
  year_watched text,
  added_at timestamptz default now() not null,

  -- prevent duplicate entries per user
  unique (user_id, tmdb_id, media_type)
);

alter table public.entries enable row level security;

create policy "Users can read own entries"
  on public.entries for select using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.entries for insert with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.entries for update using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.entries for delete using (auth.uid() = user_id);

-- Indexes for common queries
create index idx_entries_user on public.entries (user_id);
create index idx_entries_user_media on public.entries (user_id, media_type);
create index idx_entries_user_recommended on public.entries (user_id) where recommended = true;
create index idx_entries_user_rewatch on public.entries (user_id) where rewatch = true;

-- 3. Watchlist (bucket — titles queued to watch)
create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  year text,
  genres text[] default '{}',
  poster text,
  overview text,
  tmdb_rating numeric(3,1),
  runtime integer,
  seasons integer default 0,
  episodes integer default 0,
  imdb_id text,
  added_at timestamptz default now() not null,

  unique (user_id, tmdb_id, media_type)
);

alter table public.watchlist enable row level security;

create policy "Users can read own watchlist"
  on public.watchlist for select using (auth.uid() = user_id);

create policy "Users can insert own watchlist"
  on public.watchlist for insert with check (auth.uid() = user_id);

create policy "Users can update own watchlist"
  on public.watchlist for update using (auth.uid() = user_id);

create policy "Users can delete own watchlist"
  on public.watchlist for delete using (auth.uid() = user_id);

create index idx_watchlist_user on public.watchlist (user_id);
create index idx_watchlist_user_media on public.watchlist (user_id, media_type);

-- 4. Custom tags (per-user tag library)
create table public.custom_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now() not null,

  unique (user_id, name)
);

alter table public.custom_tags enable row level security;

create policy "Users can read own tags"
  on public.custom_tags for select using (auth.uid() = user_id);

create policy "Users can insert own tags"
  on public.custom_tags for insert with check (auth.uid() = user_id);

create policy "Users can delete own tags"
  on public.custom_tags for delete using (auth.uid() = user_id);

create index idx_custom_tags_user on public.custom_tags (user_id);
