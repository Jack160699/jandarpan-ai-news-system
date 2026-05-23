-- Multilingual newsroom: translation bundles on generated articles

alter table generated_articles
  add column if not exists translations jsonb not null default '{}'::jsonb;

create index if not exists idx_generated_articles_translations_langs
  on generated_articles using gin (translations);

comment on column generated_articles.translations is
  'Per-locale headline/summary/body/seo bundles (hi, en, cg, mr, bn, ta)';
