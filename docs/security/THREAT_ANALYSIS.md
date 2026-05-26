# Threat Analysis — Jan Darpan OS

## STRIDE Summary

| Threat | Vector | Likelihood | Impact | Mitigation (post-033) |
|--------|--------|------------|--------|------------------------|
| **Spoofing** | Stolen session cookie | Medium | High | httpOnly cookies, session revocation, 4h inactivity timeout |
| **Spoofing** | Credential stuffing | High | High | Rate limits, account lockout, 2FA |
| **Tampering** | Direct PostgREST with anon key | Medium | High | RLS deny on sensitive tables; monetization public read removed |
| **Tampering** | Privilege escalation (team API) | Low | Critical | super_admin guards, permission change audit log |
| **Repudiation** | Deny admin action | Medium | Medium | `security_audit_events`, `editorial_audit_log` |
| **Info disclosure** | Cross-tenant monetization SELECT | High | High | **Fixed** — service role only |
| **Info disclosure** | Draft articles via anon | Medium | High | **Fixed** — published-only RLS |
| **Info disclosure** | Intelligence vector search (anon) | Medium | Medium | **Fixed** — revoke anon execute |
| **DoS** | Login/API flood | Medium | Medium | Rate limiting (Redis/in-memory) |
| **EoP** | super_admin self-promote via RLS | Low | High | security_definer helpers; app-layer team API |
| **EoP** | Journalist accesses `/dashboard/billing` | Medium | Low | **Fixed** — DashboardGate + middleware RBAC |

---

## Attack Trees (Abbreviated)

### AT-1: Cross-tenant data exfiltration via Supabase anon key

```
Attacker obtains NEXT_PUBLIC_SUPABASE_ANON_KEY
  → Query monetization_placements
    → [BLOCKED 033] No anon policy
  → Query generated_articles
    → [LIMITED 033] Only published rows
  → Query tenant_memberships
    → [BLOCKED] Own row only (needs victim JWT)
```

### AT-2: Session hijacking

```
Attacker steals nr-dashboard-access cookie
  → Use admin UI
    → [MITIGATED] Revocation list checked in getDashboardSession
    → [MITIGATED] Inactivity timeout clears session
  → Victim revokes all sessions
    → [BLOCKED] isSessionRevoked returns true
```

### AT-3: Brute-force admin login

```
Attacker POST /api/dashboard/auth/login
  → [MITIGATED] 8 attempts / 15 min per email+IP
  → [MITIGATED] 12 failures → account_locked event
  → [OPTIONAL] 2FA required if enrolled
```

---

## Residual Risks

1. **Service role in server** — Compromise of `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. Mitigate with secret rotation, Vercel env isolation, least-privilege CI.
2. **Realtime broadcast** — Channels are tenant-scoped but not cryptographically authenticated; eavesdropping possible if channel name guessed without tenant UUID.
3. **Public tenant metadata** — Active `newsroom_tenants` rows readable for routing.
4. **CSP `unsafe-inline`** — Required for Next.js hydration; tighten with nonces in future.

---

## Recommended Monitoring

- Alert on `event_type = suspicious_login` spike
- Alert on `account_locked` > N/hour
- Dashboard: `GET /api/security/audit` (super_admin)
- Ship logs to SIEM from `security_audit_events`
