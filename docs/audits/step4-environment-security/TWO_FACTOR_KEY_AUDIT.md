# TWO_FACTOR_KEY_AUDIT

**Step:** 4 — Environment & Security Hardening  
**Scope:** Encryption key posture for TOTP / two-factor secrets at rest.

## Case classification

| Case | Definition | Observed |
|---|---|---|
| **A** | No `user_two_factor` rows; no encrypted TOTP payloads | **Current** — rows = 0; encrypted totp = 0 |
| **B** | Rows exist encrypted under dedicated key only | N/A |
| **C** | Rows exist that may need dual-key / re-encrypt migration | Not present; dual-key path prepared for future |

## Production key posture

| Item | Status |
|---|---|
| `SECURITY_2FA_ENCRYPTION_KEY` | Configured in Production (was missing) |
| Dedicated-key encrypt preference | Implemented in code |
| Dual-key decrypt (dedicated → service-role legacy) | Implemented for future Case C |
| Record migration needed now | **No** (Case A — zero rows) |
| Legacy service-role fallback in decrypt | **Retained by design** until Case C tooling is used later |

## Code touchpoints

- `src/lib/security/two-factor.ts` — dual-key decrypt; encrypt prefers dedicated key; helpers exported
- Tests: `two-factor.step4.test.ts` (expected in CI)

## Risk assessment (Case A)

| Risk | Level | Notes |
|---|---|---|
| Existing ciphertext under wrong key | None | Zero encrypted rows |
| Immediate re-encrypt migration | Not required | Case A |
| Missing dedicated key in Production | Mitigated | Now configured |
| Preview missing dedicated key | Partial | Preview env parity blocked; see remaining actions |

## Security notes

- No key material, hex strings, or ciphertext samples are recorded in this audit.
- Service-role fallback remains for decrypt only; new encrypt prefers dedicated key.
- Do not remove legacy decrypt fallback until a deliberate Case C migration completes and is verified.
