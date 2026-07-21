-- 068 reader_profiles — editable public profile separate from provider identity
-- Forward-only. Do NOT apply remotely from Agent 6 — Agent 7 owns migration apply.
--
-- Security model:
-- - RLS enabled; authenticated users may SELECT/INSERT/UPDATE only their own row
-- - service_role full access for ops
-- - provider_* columns store Google (or other IdP) snapshot; display_name/avatar_url are editable
-- - *_customized flags prevent login sync from overwriting user edits

create table if not exists public.reader_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  provider_display_name text,
  provider_avatar_url text,
  display_name_customized boolean not null default false,
  avatar_customized boolean not null default false,
  home_district text,
  language text,
  district_explicit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reader_profiles_display_name_len check (
    display_name is null or char_length(display_name) <= 80
  )
);

comment on table public.reader_profiles is
  'Reader editable profile; provider_* is IdP snapshot and must not overwrite customized fields';
comment on column public.reader_profiles.display_name_customized is
  'When true, login sync must not replace display_name from provider';
comment on column public.reader_profiles.avatar_customized is
  'When true, login sync must not replace avatar_url from provider';
comment on column public.reader_profiles.district_explicit is
  'When true, manual district choice is authoritative over remote defaults';

create index if not exists idx_reader_profiles_home_district
  on public.reader_profiles (home_district)
  where home_district is not null;

alter table public.reader_profiles enable row level security;

drop policy if exists "reader_profiles_select_own" on public.reader_profiles;
create policy "reader_profiles_select_own"
  on public.reader_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "reader_profiles_insert_own" on public.reader_profiles;
create policy "reader_profiles_insert_own"
  on public.reader_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "reader_profiles_update_own" on public.reader_profiles;
create policy "reader_profiles_update_own"
  on public.reader_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reader_profiles_service_role" on public.reader_profiles;
create policy "reader_profiles_service_role"
  on public.reader_profiles
  for all
  to service_role
  using (true)
  with check (true);

-- Optional avatar bucket + storage RLS. Skipped safely when storage is unavailable.
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'reader-avatars',
    'reader-avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp']
  )
  on conflict (id) do update set
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "reader_avatars_select_public" on storage.objects;
  create policy "reader_avatars_select_public"
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id = 'reader-avatars');

  drop policy if exists "reader_avatars_insert_own" on storage.objects;
  create policy "reader_avatars_insert_own"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'reader-avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "reader_avatars_update_own" on storage.objects;
  create policy "reader_avatars_update_own"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'reader-avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'reader-avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "reader_avatars_delete_own" on storage.objects;
  create policy "reader_avatars_delete_own"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'reader-avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception
  when undefined_table then
    raise notice 'storage schema unavailable — reader-avatars bucket skipped';
  when others then
    raise notice 'reader-avatars storage setup skipped: %', sqlerrm;
end $$;
