-- AI news shorts — 60s summaries, voice, reels, subtitles

alter table generated_articles
  add column if not exists shorts_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_generated_articles_shorts_ready
  on generated_articles ((shorts_metadata->>'status'))
  where (shorts_metadata->>'status') = 'ready';

comment on column generated_articles.shorts_metadata is
  'News short bundle: 60s script, subtitles, voice, reel slides, highlights';
