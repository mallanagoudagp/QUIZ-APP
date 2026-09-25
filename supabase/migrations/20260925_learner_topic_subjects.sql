-- Run this for Supabase projects created before subject-wise progress was added.
alter table public.learner_topics
  add column if not exists subject text not null default 'Previously studied';

alter table public.learner_topics
  drop constraint if exists learner_topics_pkey;

alter table public.learner_topics
  add constraint learner_topics_pkey primary key (user_id, subject, topic);
