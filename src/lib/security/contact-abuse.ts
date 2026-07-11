/**
 * Contact form abuse checks — no email delivery; spam resistance only.
 */

const HONEYPOT_FIELDS = ["website", "company_url", "_hp", "url"] as const;

export function isContactHoneypotTriggered(body: Record<string, unknown>): boolean {
  for (const field of HONEYPOT_FIELDS) {
    const value = body[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return true;
    }
  }
  return false;
}
