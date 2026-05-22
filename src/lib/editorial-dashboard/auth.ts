/**
 * Editorial dashboard authentication
 */

export function getExpectedAdminSecret(): string | null {
  return (
    process.env.ADMIN_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  );
}

export function isAdminAuthorized(key: string | undefined | null): boolean {
  const expected = getExpectedAdminSecret();
  if (!expected) return process.env.NODE_ENV === "development";
  return key === expected;
}

export function verifyAdminRequest(request: Request): boolean {
  const expected = getExpectedAdminSecret();
  if (!expected) return process.env.NODE_ENV === "development";

  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");
  if (queryKey === expected) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;

  const headerKey = request.headers.get("x-admin-key");
  if (headerKey === expected) return true;

  return false;
}
