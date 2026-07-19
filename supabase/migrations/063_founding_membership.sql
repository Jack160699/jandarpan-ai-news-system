-- Founding reader membership: first-1000 free offer with concurrency-safe claims

create table if not exists founding_offer_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  cap integer not null default 1000 check (cap >= 0),
  active boolean not null default true,
  message_hi text,
  message_en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create table if not exists founding_offer_claims (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, position)
);

create index if not exists idx_founding_claims_tenant
  on founding_offer_claims (tenant_id, created_at desc);

comment on table founding_offer_config is 'First-1000 founding reader offer: cap, pause state, campaign copy';
comment on table founding_offer_claims is 'One row per verified user claim; position is the founding number';

alter table founding_offer_config enable row level security;
alter table founding_offer_claims enable row level security;

-- Config is publicly readable (cap + active state power the live counter)
drop policy if exists "Public read founding config" on founding_offer_config;
create policy "Public read founding config"
  on founding_offer_config for select
  to anon, authenticated
  using (true);

drop policy if exists "Service role founding config" on founding_offer_config;
create policy "Service role founding config"
  on founding_offer_config for all
  to service_role
  using (true)
  with check (true);

-- Users may read only their own claim; all writes go through the definer fn
drop policy if exists "Own claim read" on founding_offer_claims;
create policy "Own claim read"
  on founding_offer_claims for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role founding claims" on founding_offer_claims;
create policy "Service role founding claims"
  on founding_offer_claims for all
  to service_role
  using (true)
  with check (true);

-- Atomic claim: FOR UPDATE on the config row serializes concurrent claims,
-- making it impossible to exceed the cap. Idempotent on retry.
create or replace function claim_founding_membership(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_cap integer;
  v_active boolean;
  v_claimed integer;
  v_existing_position integer;
  v_position integer;
  v_plan_id uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  select cap, active into v_cap, v_active
  from founding_offer_config
  where tenant_id = p_tenant_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'offer_not_found');
  end if;

  select position into v_existing_position
  from founding_offer_claims
  where tenant_id = p_tenant_id and user_id = v_user;

  select count(*) into v_claimed
  from founding_offer_claims
  where tenant_id = p_tenant_id;

  if v_existing_position is not null then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'position', v_existing_position,
      'remaining', greatest(v_cap - v_claimed, 0)
    );
  end if;

  if not v_active then
    return jsonb_build_object('ok', false, 'reason', 'offer_paused',
      'remaining', greatest(v_cap - v_claimed, 0));
  end if;

  if v_claimed >= v_cap then
    return jsonb_build_object('ok', false, 'reason', 'sold_out', 'remaining', 0);
  end if;

  v_position := v_claimed + 1;
  select email into v_email from auth.users where id = v_user;

  insert into founding_offer_claims (tenant_id, user_id, email, position)
  values (p_tenant_id, v_user, v_email, v_position);

  -- Grant the founding membership as an active zero-cost subscription
  select id into v_plan_id
  from reader_plans
  where tenant_id = p_tenant_id and slug = 'founding-reader'
  limit 1;

  if v_plan_id is not null and v_email is not null and not exists (
    select 1 from reader_subscriptions
    where tenant_id = p_tenant_id and email = v_email and status = 'active'
  ) then
    insert into reader_subscriptions (tenant_id, plan_id, email, status, metadata)
    values (
      p_tenant_id, v_plan_id, v_email, 'active',
      jsonb_build_object('source', 'founding_offer', 'position', v_position)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'position', v_position,
    'remaining', greatest(v_cap - v_position, 0)
  );
end;
$$;

revoke all on function claim_founding_membership(uuid) from public;
grant execute on function claim_founding_membership(uuid) to authenticated;
grant execute on function claim_founding_membership(uuid) to service_role;

-- Public live counter (cap, claimed, remaining, active)
create or replace function founding_offer_status(p_tenant_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'cap', c.cap,
    'active', c.active,
    'claimed', (
      select count(*) from founding_offer_claims f
      where f.tenant_id = c.tenant_id
    ),
    'remaining', greatest(
      c.cap - (
        select count(*) from founding_offer_claims f
        where f.tenant_id = c.tenant_id
      ), 0),
    'message_hi', c.message_hi,
    'message_en', c.message_en
  )
  from founding_offer_config c
  where c.tenant_id = p_tenant_id;
$$;

revoke all on function founding_offer_status(uuid) from public;
grant execute on function founding_offer_status(uuid) to anon;
grant execute on function founding_offer_status(uuid) to authenticated;
grant execute on function founding_offer_status(uuid) to service_role;

-- Seed: founding-reader plan + offer config for existing tenants
insert into reader_plans (tenant_id, slug, name_en, name_hi, price_inr, billing_interval, features, sort_order, active)
select
  t.id,
  'founding-reader',
  'Founding Reader',
  'संस्थापक पाठक',
  0,
  'one_time',
  '["founding_badge", "saved_stories", "reading_history", "district_alerts", "audio_briefings"]'::jsonb,
  0,
  true
from newsroom_tenants t
where not exists (
  select 1 from reader_plans p
  where p.tenant_id = t.id and p.slug = 'founding-reader'
);

insert into founding_offer_config (tenant_id, cap, active, message_hi, message_en)
select
  t.id,
  1000,
  true,
  'पहले 1,000 पाठकों के लिए सदस्यता निःशुल्क',
  'Free membership for the first 1,000 readers'
from newsroom_tenants t
where not exists (
  select 1 from founding_offer_config c where c.tenant_id = t.id
);
