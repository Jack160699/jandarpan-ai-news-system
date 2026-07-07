-- 051: Forward repair — organization_settings seed (045 never applied on production).
-- Idempotent INSERT. Does not modify schema_migrations history.

INSERT INTO public.platform_config (config_key, config_value, category, description)
VALUES (
  'organization_settings',
  '{
    "organizationName": "Jan Darpan Chhattisgarh",
    "logoUrl": "/brand/jan-darpan-chhattisgarh-logo.png",
    "email": "hello@jandarpan.news",
    "phone": "+91-771-000-0000",
    "address": "Press Enclave, Shankar Nagar",
    "city": "Raipur",
    "state": "Chhattisgarh",
    "facebook": "",
    "instagram": "",
    "x": "",
    "youtube": "",
    "linkedin": "",
    "telegram": "",
    "whatsapp": "",
    "googleMapsUrl": "",
    "copyrightEmail": "hello@jandarpan.news",
    "editorialEmail": "hello@jandarpan.news",
    "correctionsEmail": "hello@jandarpan.news"
  }'::jsonb,
  'organization',
  'Publisher identity, contact, and social profiles'
)
ON CONFLICT (config_key) DO NOTHING;

insert into public.schema_registry (key, value, updated_at)
values (
  'migration_reconciliation_organization',
  '051_organization_settings_seed',
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = excluded.updated_at;
