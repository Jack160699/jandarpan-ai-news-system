# Migration dependency graph

```mermaid
flowchart TB
  subgraph core [Core news]
    M001[001 news_articles]
    M002[002 ingestion_logs]
    M003[003 rss_source_health]
    M004[004 slug]
    M005[005 public read]
    M006[006 ai queue]
  end

  subgraph ai [AI newsroom]
    M007[007 signals events generated]
    M008[008 clustering]
    M009[009 editorial metadata]
    M010[010 image queue]
    M011[011 editorial control]
  end

  subgraph saas [SaaS]
    M017[017 newsroom_tenants]
    M018[018 tenant_memberships]
    M019[019 monetization]
    M020[020 reader_analytics]
    M021[021 RLS hardening]
  end

  subgraph auth [Auth RBAC]
    M023[023 roles]
    M024[024 normalize + FK auth.users]
    M025[025 display_name]
    M026[026 team RLS]
  end

  subgraph features [Features 027-032]
    M027[027 workflow]
    M028[028 intelligence vectors]
    M029[029 analytics schedules]
    M030[030 DAM]
    M031[031 collaboration]
    M032[032 team sync + postgrest reload]
  end

  subgraph stabilize [Stabilization 033-037]
    M033[033 platform admin]
    M034[034 schema stabilization]
    M035[035 enterprise security]
    M036[036 worker infrastructure]
    M037[037 ops observability]
  end

  M001 --> M002 --> M003 --> M004 --> M005 --> M006 --> M007
  M007 --> M008 --> M009 --> M010 --> M011
  M007 --> M017
  M017 --> M018 --> M019 --> M020 --> M021
  M018 --> M023 --> M024 --> M025 --> M026
  M017 --> M027
  M007 --> M027
  M017 --> M028
  M007 --> M028
  M017 --> M029
  M017 --> M030
  M027 --> M031
  M018 --> M032
  M017 --> M033
  M032 --> M034
  M034 --> M035 --> M036 --> M037
```

## Critical path for admin systems

| Feature | Minimum migrations |
|---------|-------------------|
| Team / RBAC | 018 → 021 → 024 → 025 → 032 → **034** |
| Workflow board | 007 → 011 → 017 → 027 → **034** |
| Intelligence vectors | 017 → 028 → **034** |
| DAM | 017 → 030 → **034** |
| Collaboration | 027 → 031 → **034** |
| Ingestion admin | 002 → 003 → **034** |

## Version collision rule

Supabase uses the **numeric prefix only** as `schema_migrations.version`. Only one file per version number (e.g. one `034_*.sql`).
