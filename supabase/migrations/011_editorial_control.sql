-- Editorial control: approve/reject, homepage pins

alter table public.generated_articles
  add column if not exists editorial_status text not null default 'approved'
    check (editorial_status in ('pending', 'approved', 'rejected'));

alter table public.generated_articles
  add column if not exists homepage_pin boolean not null default false;

alter table public.generated_articles
  add column if not exists pinned_at timestamptz;

alter table public.generated_articles
  add column if not exists reviewed_at timestamptz;

create index if not exists generated_articles_editorial_status_idx
  on public.generated_articles (editorial_status, published_at desc nulls last);

create index if not exists generated_articles_homepage_pin_idx
  on public.generated_articles (homepage_pin desc, pinned_at desc nulls last)
  where homepage_pin = true;
