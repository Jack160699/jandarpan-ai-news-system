-- Controlled first verification cycle evidence (adapters blocked: missing credentials / consent).
-- No prices invented. No observations. No snapshots.
insert into public.verified_rate_verification_runs (
  category, geo_scope, city_slug, state_code, country_code, purity, unit, tax_basis,
  status, source_count, participating_families, effective_date, generated_at, error_code, redacted_notes
) values
  ('petrol', 'city', 'raipur', 'CG', 'IN', null, 'litre', 'retail_rsp_indicative', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ulip_credentials_missing', 'Controlled cycle: adapters blocked; no invented price'),
  ('diesel', 'city', 'raipur', 'CG', 'IN', null, 'litre', 'retail_rsp_indicative', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ulip_credentials_missing', 'Controlled cycle: adapters blocked; no invented price'),
  ('petrol', 'city', 'durg', 'CG', 'IN', null, 'litre', 'retail_rsp_indicative', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ulip_credentials_missing', 'Controlled cycle: adapters blocked; no invented price'),
  ('diesel', 'city', 'durg', 'CG', 'IN', null, 'litre', 'retail_rsp_indicative', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ulip_credentials_missing', 'Controlled cycle: adapters blocked; no invented price'),
  ('petrol', 'city', 'bhilai', 'CG', 'IN', null, 'litre', 'retail_rsp_indicative', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ulip_credentials_missing', 'Controlled cycle: adapters blocked; no invented price'),
  ('diesel', 'city', 'bhilai', 'CG', 'IN', null, 'litre', 'retail_rsp_indicative', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ulip_credentials_missing', 'Controlled cycle: adapters blocked; no invented price'),
  ('gold_24k', 'state', null, 'CG', 'IN', '999', '10g', 'ex_gst_benchmark', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ibja_display_consent_missing', 'Controlled cycle: adapters blocked; no invented price'),
  ('gold_22k', 'state', null, 'CG', 'IN', '916', '10g', 'ex_gst_benchmark', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ibja_display_consent_missing', 'Controlled cycle: adapters blocked; no invented price'),
  ('silver_999', 'state', null, 'CG', 'IN', '999', 'kg', 'ex_gst_benchmark', 'blocked', 0, 0, (timezone('Asia/Kolkata', now()))::date, now(), 'ibja_display_consent_missing', 'Controlled cycle: adapters blocked; no invented price');

select category, city_slug, status, error_code, count(*)::int as n
from public.verified_rate_verification_runs
group by 1,2,3,4
order by 1,2;
