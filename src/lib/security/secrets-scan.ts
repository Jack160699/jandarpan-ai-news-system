/**
 * Lightweight secret pattern scanner for logs/responses (defense in depth)
 */

const LEAK_PATTERNS: RegExp[] = [
  /sk_live_[a-zA-Z0-9]{20,}/,
  /sk_test_[a-zA-Z0-9]{20,}/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/i,
  /eyJhbGciOiJIUzI1NiIs[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
];

export function containsPotentialSecret(text: string): boolean {
  return LEAK_PATTERNS.some((p) => p.test(text));
}

export function redactSecrets(text: string): string {
  let out = text;
  for (const pattern of LEAK_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}
