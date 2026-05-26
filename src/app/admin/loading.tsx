/**
 * Route-level loading UI (replaces stuck client Suspense fallback).
 * Server gate resolves within 8s or shows recovery card.
 */
export default function AdminRouteLoading() {
  return (
    <div className="admin-safe-guard admin-safe-guard--loading" aria-busy>
      <div className="admin-safe-guard__card">
        <p className="admin-safe-guard__eyebrow">Newsroom</p>
        <p className="admin-safe-guard__message">Starting admin workspace…</p>
      </div>
    </div>
  );
}
