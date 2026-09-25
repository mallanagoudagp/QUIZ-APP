-- Run this once in your Supabase project's SQL editor
-- (Project → SQL Editor → New query → paste → Run).
--
-- This is the only table the app needs. Study sessions themselves are NOT
-- synced to Supabase in this version — only the per-topic accuracy that
-- drives personalization (difficulty + explanation depth). Sessions still
-- live in localStorage / export-import. See README "What I'd do next" if
-- you want to add cloud session sync too.

create table if not exists public.learner_topics (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  topic      text        not null,
  attempts   integer     not null default 0,
  correct    integer     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic)
);

alter table public.learner_topics enable row level security;

-- Each user can only ever see or touch their own rows. auth.uid() is the
-- signed-in user's id, provided automatically by Supabase from the JWT.
create policy "select own topic stats"
  on public.learner_topics for select
  using (auth.uid() = user_id);

create policy "insert own topic stats"
  on public.learner_topics for insert
  with check (auth.uid() = user_id);

create policy "update own topic stats"
  on public.learner_topics for update
  using (auth.uid() = user_id);

create policy "delete own topic stats"
  on public.learner_topics for delete
  using (auth.uid() = user_id);

create table if not exists public.study_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.study_sessions enable row level security;
create policy "users manage own study session"
  on public.study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.learner_reviews (
  user_id uuid not null references auth.users (id) on delete cascade,
  block_id text not null,
  block jsonb not null,
  box integer not null default 0 check (box between 0 and 5),
  due_at timestamptz not null,
  primary key (user_id, block_id)
);
alter table public.learner_reviews enable row level security;
create policy "users manage own learner reviews"
  on public.learner_reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
