import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptTotpSecretFromStorage,
  encryptTotpSecretForStorage,
  isDedicated2faKeyConfigured,
} from "@/lib/security/two-factor";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Step 4 2FA dual-key encryption", () => {
  it("encrypts with dedicated key and decrypts with dedicated key", () => {
    vi.stubEnv("SECURITY_2FA_ENCRYPTION_KEY", "dedicated-step4-key-aaaaaaaa");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-service-role-bbbbbbbb");
    expect(isDedicated2faKeyConfigured()).toBe(true);
    const enc = encryptTotpSecretForStorage("JBSWY3DPEHPK3PXP");
    expect(enc).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptTotpSecretFromStorage(enc)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("decrypts legacy service-role ciphertext after dedicated key is introduced", () => {
    vi.stubEnv("SECURITY_2FA_ENCRYPTION_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-service-role-bbbbbbbb");
    const legacyCipher = encryptTotpSecretForStorage("LEGACYSECRET1234");

    vi.stubEnv("SECURITY_2FA_ENCRYPTION_KEY", "dedicated-step4-key-aaaaaaaa");
    expect(decryptTotpSecretFromStorage(legacyCipher)).toBe("LEGACYSECRET1234");
  });

  it("rejects ciphertext when neither key matches", () => {
    vi.stubEnv("SECURITY_2FA_ENCRYPTION_KEY", "key-aaaa");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-bbbb");
    const enc = encryptTotpSecretForStorage("SECRETVALUE");
    vi.stubEnv("SECURITY_2FA_ENCRYPTION_KEY", "other-key-zzzz");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "other-legacy-yyyy");
    expect(() => decryptTotpSecretFromStorage(enc)).toThrow();
  });
});
