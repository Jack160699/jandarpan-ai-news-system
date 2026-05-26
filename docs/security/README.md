# Jan Darpan OS — Security Documentation

| Document | Description |
|----------|-------------|
| [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) | Full audit findings and remediations |
| [RLS_MATRIX.md](./RLS_MATRIX.md) | Per-table RLS policy matrix |
| [RBAC_MAP.md](./RBAC_MAP.md) | Roles, permissions, routes, APIs |
| [THREAT_ANALYSIS.md](./THREAT_ANALYSIS.md) | STRIDE threat model |
| [ENTERPRISE_READINESS.md](./ENTERPRISE_READINESS.md) | Scorecard (78/100) and go-live gates |

## Quick Start (Production)

```bash
# Apply migration
supabase db push

# Required env
SECURITY_2FA_ENCRYPTION_KEY=<random-32-bytes-hex>
NEWSROOM_SUPER_ADMIN_EMAILS=admin@yourdomain.com
CRON_SECRET=<strong-secret>

# Optional hardening
SECURITY_REQUIRE_2FA=1          # Mandate 2FA for super_admin logins
SECURITY_ENV_STRICT=1           # Fail boot on missing prod env
UPSTASH_REDIS_REST_URL=...      # Distributed rate limits
```

## Security API Endpoints

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/security/2fa/status` | GET | Dashboard session |
| `/api/security/2fa/setup` | POST | Dashboard session |
| `/api/security/2fa/setup` | PUT | Confirm enrollment |
| `/api/security/2fa/disable` | POST | Dashboard + TOTP |
| `/api/security/sessions` | GET/DELETE | Dashboard session |
| `/api/security/audit` | GET | Super admin |
