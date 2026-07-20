# TWO_FACTOR_KEY_ROTATION

**Step:** 4 — Environment & Security Hardening  
**Status:** Dedicated key introduced; **no ciphertext rotation required** (Case A).

## Rotation decision

| Question | Answer |
|---|---|
| Are there encrypted TOTP records? | No (`user_two_factor` = 0; encrypted totp = 0) |
| Is record re-encryption required now? | **No** |
| Was a dedicated Production key added? | **Yes** (`SECURITY_2FA_ENCRYPTION_KEY`) |
| Dual-key read path ready for Case C? | **Yes** (dedicated first, then service-role legacy) |

## Procedure followed (Case A introduce-key)

1. Configure `SECURITY_2FA_ENCRYPTION_KEY` in Production (value not recorded).
2. Ship code that:
   - Prefers dedicated key for encrypt
   - Tries dedicated key then legacy service-role material for decrypt
3. Confirm zero rows → skip migrate/re-encrypt tooling
4. Leave legacy decrypt fallback in place by design

## Future Case C rotation outline (not executed)

When encrypted rows exist under legacy material:

1. Ensure dedicated key is set in the target environment.
2. Use dual-key decrypt to read all rows.
3. Re-encrypt with dedicated key only (batch tooling — not in this step).
4. Verify decrypt with dedicated key alone on a sample.
5. Only then consider removing legacy decrypt fallback.

## Preview

- Dedicated 2FA key Preview add: blocked / incomplete (`git_branch_required` / branch not pushed).
- Production remains the hardening target.

## Rollback

- Code rollback: `backup/before-step4-environment-security-hardening` @ `f23df88`
- Env: dedicated key can remain (harmless with dual-key path) or be removed only with coordinated code rollback.
- No ciphertext to roll back under Case A.
