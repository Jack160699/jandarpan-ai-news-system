/**
 * Provider fetch timeout wrapper (8s default per provider)
 */

export const PROVIDER_FETCH_TIMEOUT_MS = 8_000;

export async function fetchWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs = PROVIDER_FETCH_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Provider timeout after ${timeoutMs}ms`)),
        timeoutMs
      );
    }),
  ]);
}
